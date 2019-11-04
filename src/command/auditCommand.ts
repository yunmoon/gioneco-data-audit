import * as yargs from "yargs";
import DataAudit from "../dataAudit";

export class AuditCommand implements yargs.CommandModule {
  command = "audit";
  describe = "将缓存表的数据与clickhouse做审计";
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
    }).option("chHost", {
      demand: true,
      type: "string",
      describe: "clickhouse connect host"
    }).option("chPort", {
      default: 8123,
      type: "string",
      describe: "clickhouse connect port"
    }).option("chUser", {
      default: "default",
      type: "string",
      describe: "clickhouse connect user"
    }).option("chPassword", {
      default: "",
      type: "string",
      describe: "clickhouse connect password"
    }).option("chDatabase", {
      default: "default",
      type: "string",
      describe: "clickhouse connect database"
    }).option("tableMap", {
      demand: true,
      type: "string",
      describe: "mysql 与 clickhouse 表映射关系，多个关系以英文','隔开。比如orders:t-real-data-order-pay-success"
    }).option("table", {
      demand: true,
      type: "string",
      describe: "mysql审计表名"
    }).option("start", {
      demand: true,
      type: "string",
      describe: "审计时间范围，开始时间"
    }).option("end", {
      demand: true,
      type: "string",
      describe: "审计时间范围，结束时间"
    }).option("logging", {
      type: "boolean",
      describe: "是否打印日志"
    })
  }
  async handler(args) {
    const mysqlConnection = {
      type: "mysql",
      host: args.host,
      username: args.username,
      password: args.password,
      port: args.port,
      database: args.database,
      logging: args.logging
    }
    const clickHouseConnection = {
      host: args.chHost,
      port: args.chPort,
      user: args.chUser,
      password: args.chPassword,
      queryOptions: {
        database: args.chDatabase
      }
    }

    const tableMap = args.tableMap.split(",");
    let tableMapData = {}
    for (const item of tableMap) {
      const data = item.split(":");
      if (data.length !== 2) {
        throw new Error("tableMap 格式错误");
      }
      tableMapData[data[0]] = data[1];
    }
    const auditData = new DataAudit(mysqlConnection, clickHouseConnection, tableMapData);
    await auditData.init();
    await auditData.run({ startTime: args.start, endTime: args.end, auditTable: args.table, logging: args.logging });
    process.exit();
  }
}