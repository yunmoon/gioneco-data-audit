#!/usr/bin/env node
import * as yargs from "yargs";
import { InitCommand } from "./command/initCommand";
import { SyncDataToAuditCacheTableCommand } from "./command/syncDataToAuditCacheTableCommand";
import { AuditCommand } from "./command/auditCommand";
yargs.usage("Usage: $0 <command> [options]")
  .command(new InitCommand())
  .command(new SyncDataToAuditCacheTableCommand())
  .command(new AuditCommand())
  .recommendCommands()
  .demandCommand(1)
  // .strict()
  .alias("v", "version")
  .help("h")
  .alias("h", "help")
  .argv;