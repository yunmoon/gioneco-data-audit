#!/usr/bin/env node
import * as yargs from "yargs";
import { InitCommand } from "./command/initCommand";
yargs.usage("Usage: $0 <command> [options]")
  .command(new InitCommand())
  .recommendCommands()
  .demandCommand(1)
  // .strict()
  .alias("v", "version")
  .help("h")
  .alias("h", "help")
  .argv;