import * as yargs from "yargs";
import { createConnection, Table, TableIndex } from "typeorm";
import { DATA_AUDIT_CACHE_TABLE } from "../constant";
export class InitCommand implements yargs.CommandModule {
  command = "init";
  describe = "初始化数据审计缓存表";
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
    })
  }
  async handler(args) {
    const connection = await createConnection({
      type: "mysql",
      host: args.host,
      username: args.username,
      password: `${args.password}`,
      port: args.port,
      database: args.database,
      logging: true
    })
    const queryRunner = connection.createQueryRunner();
    await queryRunner.createTable(new Table({
      name: DATA_AUDIT_CACHE_TABLE,
      columns: [
        {
          name: "id",
          type: "int",
          isGenerated: true,
          generationStrategy: "increment",
          isPrimary: true
        },
        {
          name: "uuid",
          type: "varchar(32)"
        },
        {
          name: "extra",
          type: "text"
        },
        {
          name: "audit_table",
          type: "varchar(255)"
        },
        {
          name: "uuid_column",
          type: "varchar(32)"
        },
        {
          name: "createdAt",
          type: "datetime",
          default: "now()"
        },
        {
          name: "updatedAt",
          type: "datetime",
          default: "now()"
        }
      ]
    }), true)
    await queryRunner.createIndex(DATA_AUDIT_CACHE_TABLE, new TableIndex({
      name: "uuid_audit_table_index",
      columnNames: ["uuid", "audit_table"]
    }));
    console.log("初始化成功");
    process.exit()
  }
}