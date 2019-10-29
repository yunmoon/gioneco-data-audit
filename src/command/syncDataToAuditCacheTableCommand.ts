import * as yargs from "yargs";
import { createConnection, QueryRunner, getRepository, Repository } from "typeorm";
// import { DATA_AUDIT_CACHE_TABLE } from "../constant";
import { AuditCache } from "../entity/auditCache";
import path = require("path");
import _ = require("lodash");
import * as times from "async/times";
import { isNull } from "util";

async function syncData(queryRunner: QueryRunner,
  tableName, originalTableName, timeColumn,
  start, end, repository: Repository<AuditCache>,
  column, extra, unique, condition) {
  let page = 0, limit = 100, conditionArray = [], conditionStr;
  if (condition) {
    Object.keys(condition).forEach(key => {
      if (isNull(condition[key]) || condition[key] === "null" || condition[key] === "NULL") {
        conditionArray.push(`\`${key}\` is null`);
      } else {
        conditionArray.push(`\`${key}\` = '${condition[key]}'`);
      }
    })
    conditionStr = conditionArray.join(" and ");
  }
  let rows = await queryRunner.query(`select * from \`${tableName}\` where \`${timeColumn}\` between ? and ? ${condition ? `and ${conditionStr}` : ""} order by \`${timeColumn}\` asc limit ?,?`, [start, end, page * limit, limit]);
  let [count] = await queryRunner.query(`select count(1) as total from \`${tableName}\` where \`${timeColumn}\` between ? and ? ${condition ? ` and ${conditionStr}` : ""}`, [start, end]);
  console.log(`当前数据库${tableName}需要同步的数据量为：${count.total}条`)
  while (rows.length > 0) {
    for (const item of rows) {
      let existOne;
      if (unique) {
        existOne = await repository.findOne({
          where: {
            uuid: item[column],
            auditTable: originalTableName
          }
        });
      }
      if (!existOne) {
        const auditCache = new AuditCache();
        auditCache.auditTable = originalTableName;
        auditCache.time = item[timeColumn];
        auditCache.timeColumn = timeColumn;
        auditCache.uuid = item[column];
        auditCache.uuidColumn = column;
        if (extra) {
          const extraKeys = extra.split(",");
          const extraData = {};
          extraKeys.forEach(ek => {
            extraData[ek] = item[ek];
          });
          auditCache.extra = JSON.stringify(extraData);
        } else {
          auditCache.extra = JSON.stringify({});
        }
        await repository.insert(auditCache);
      }
    }
    page++;
    rows = await queryRunner.query(`select * from \`${tableName}\` where \`${timeColumn}\` between ? and ? order by \`${timeColumn}\` asc limit ?,?`, [start, end, page * limit, limit]);
  }
}

export class SyncDataToAuditCacheTableCommand implements yargs.CommandModule {
  command = "sync";
  describe = "同步表中数据到数据审计缓存表";
  builder(args: yargs.Argv) {
    return args.option("host", {
      alias: "H",
      default: "127.0.0.1",
      describe: "mysql connect host"
    }).option("username", {
      alias: "u",
      default: "root",
      describe: "mysql connect username"
    }).option("password", {
      alias: "p",
      default: "",
      type: "string",
      describe: "mysql connect password"
    }).option("port", {
      alias: "P",
      default: "3306",
      type: "string",
      describe: "mysql connect port"
    }).option("database", {
      alias: "d",
      demand: true,
      type: "string",
      describe: "mysql select database"
    }).option("table", {
      demand: true,
      type: "string",
      describe: "同步的原始表名"
    }).option("prefix", {
      demand: true,
      type: "string",
      describe: "同步的分表名前缀"
    }).option("number", {
      default: 0,
      type: "number",
      describe: "分表数量，0则不分表"
    }).option("column", {
      demand: true,
      type: "string",
      describe: "原始表对应uuid的字段名"
    }).option("timeColumn", {
      type: "string",
      default: "createdAt",
      describe: "时间字段，筛选范围"
    }).option("extra", {
      type: "string",
      describe: "需要存储的扩展字段，多个字段使用英文','"
    }).option("start", {
      type: "string",
      demand: true,
      describe: "数据时间段，开始时间"
    }).option("end", {
      type: "string",
      demand: true,
      describe: "数据时间段，结束时间"
    }).option("thread", {
      type: "number",
      default: 1,
      describe: "导入数据并行执行数量"
    }).option("unique", {
      describe: "是否做唯一验证"
    }).option("maxConnection", {
      default: 10,
      type: "number",
      describe: "数据库最大连接数"
    }).option("condition", {
      type: "string",
      describe: "同步表筛选扩展条件，请使用如下格式：key1:value1,key2:value2"
    }).option("logging", {
      type: "boolean",
      describe: "是否打印日志"
    })
  }
  async handler(args) {
    if (args.number > 0 && args.thread > args.number) {
      throw new Error("--thread 不允许大于 --args.number");
    }
    let condition = {}, conditionArray;
    if (args.condition) {
      conditionArray = args.condition.split(",");
      for (const item of conditionArray) {
        const data = item.split(":");
        if (data.length !== 2) {
          throw new Error("condition 格式错误");
        }
        condition[data[0]] = data[1];
      }
    }
    const connection = await createConnection({
      type: "mysql",
      host: args.host,
      username: args.username,
      password: `${args.password}`,
      port: args.port,
      database: args.database,
      entities: [
        path.join(__dirname, "/../entity/*")
      ],
      extra: {
        connectionLimit: args.maxConnection
      },
      logging: args.logging
    })
    let tableName = args.prefix

    if (args.number > 0) {
      let ns = 0, tables = [];
      while (ns < args.number) {
        tableName = `${args.prefix}${ns}`;
        tables.push(tableName);
        ns++
      }
      const groupTableNames = _.chunk(tables, Math.ceil(args.number / args.thread));
      await times(groupTableNames.length, async (time) => {
        const queryRunner = connection.createQueryRunner();
        const repository = getRepository(AuditCache);
        const tables = groupTableNames[time];
        for (let index = 0; index < tables.length; index++) {
          const tableName = tables[index];
          await syncData(queryRunner, tableName, args.table, args.timeColumn, args.start, args.end, repository, args.column, args.extra, args.unique, condition);
        }
      })
    } else {
      const queryRunner = connection.createQueryRunner();
      const repository = getRepository(AuditCache);
      console.log(`当前同步分表名：${tableName}`)
      await syncData(queryRunner, tableName, args.table, args.timeColumn, args.start, args.end, repository, args.column, args.extra, args.unique, condition);
    }
    console.log("同步数据完成。");
    process.exit();
  }
}