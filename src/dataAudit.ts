import { createConnection, ConnectionOptions, getRepository, Repository, Between, Connection, In } from "typeorm";
import { AuditCache } from "./entity/auditCache";
import * as  ClickHouse from "@apla/clickhouse";
import path = require("path");
import _ = require("lodash");
import moment = require("moment");
export default class DataAudit {
  connection: Connection

  repository: Repository<AuditCache>;

  chclient;

  total = 0;

  log = console

  constructor(private dbConnection: ConnectionOptions, private clickhouseOptions, private cacheTableMap, log?) {
    this.chclient = new ClickHouse(this.clickhouseOptions);
    if (log) {
      this.log = log
    }
  }
  async init() {
    this.connection = await createConnection({
      ...this.dbConnection,
      entities: [
        path.join(__dirname, "/entity/*")
      ]
    }
    );
    this.repository = getRepository(AuditCache);
    return this
  }

  async syncDataToAuditCache(data: AuditCache) {
    await this.repository.save(data);
  }

  async run({ startTime, endTime, auditTable }) {
    this.total = 0
    const chTableName = this.cacheTableMap[auditTable];
    const cacheTableCount = await this.repository.count({
      auditTable: auditTable,
      createdAt: Between(startTime, endTime)
    });
    const { data } = await this.chclient.querying(`select count(1) from \`${chTableName}\` where \`createdAt\` between '${startTime}' and '${endTime}'`);
    let [[clickhouseDataCount]] = data;
    clickhouseDataCount = parseInt(clickhouseDataCount);
    if (clickhouseDataCount !== cacheTableCount && cacheTableCount > 0) {
      const cacheData = await this.repository.findOne({
        where: {
          auditTable,
          createdAt: Between(startTime, endTime)
        }
      })
      await this.syncData({ startTime, endTime, auditTable, column_name: cacheData.uuidColumn });
    }
  }

  private async findOneData(uuid, extra, column_name, table_name) {
    const extraData = JSON.parse(extra);
    const where = [];
    const values = []
    Object.keys(extraData).forEach(key => {
      where.push(`\`${key}\` = ?`);
      values.push(extraData[key]);
    })
    const [data] = await this.connection.query(`select * from \`${table_name}\` where \`${column_name}\` = ? ${where.length ? "and" : ""} ${where.join(" and ")} limit 1`, [uuid, ...values]);
    return data
  }

  private async syncData({ startTime, endTime, auditTable, column_name }) {
    const chTableName = this.cacheTableMap[auditTable];
    let rows = await this.repository.find({
      take: 100,
      where: {
        auditTable,
        createdAt: Between(startTime, endTime)
      }
    });
    while (rows.length > 0) {
      const uuids = _.map(rows, "uuid");
      const selectUuids = _.map(uuids, uuid => `'${uuid}'`);
      this.log.debug(`select \`${column_name}\` from \`${chTableName}\` where \`${column_name}\` in (${selectUuids.join(",")})`)
      const { data } = await this.chclient.querying(`select \`${column_name}\` from \`${chTableName}\` where \`${column_name}\` in (${selectUuids.join(",")})`);
      let clickhouseUuids = _.flatten(data);
      if (clickhouseUuids.length < uuids.length) {
        const diffUuids = _.difference(uuids, clickhouseUuids);
        if (diffUuids.length > 0) {
          this.total += diffUuids.length;
          const data = []
          for (let index = 0; index < diffUuids.length; index++) {
            const uuid = diffUuids[index];
            const auditData = _.find(rows, item => item.uuid === uuid);
            const item = await this.findOneData(uuid, auditData.extra, column_name, auditTable);
            if (item) {
              Object.keys(item).forEach(key => {
                if (item[key] instanceof Date) {
                  item[key] = moment(item[key]).format("YYYY-MM-DD HH:mm:ss");
                }
              });
              data.push(item);
            }
          }
          try {
            await this.insertDataToClickhouse(data, chTableName);
          } catch (error) {
            this.log.error(error)
            return
          }
        }
      }
      await this.repository.delete({
        uuid: In(uuids),
        auditTable: auditTable
      })
      rows = await this.repository.find({
        take: 100,
        where: {
          auditTable: auditTable,
          createdAt: Between(startTime, endTime)
        }
      });
      if (rows.length === 0) {
        this.log.info(`当前数据审计异常数据共${this.total}条`);
      }
    }

  }

  private insertDataToClickhouse(data, chTableName) {
    return new Promise((resolve, reject) => {
      const stream = this.chclient.query(`INSERT INTO \`${chTableName}\``, { format: "JSONEachRow" }, async function (err, result) {
        if (err) {
          reject(err)
        } else {
          resolve(result);
        }
      });
      for (const item of data) {
        stream.write(item);
      }
      stream.end();
    })
  }
}