#!/usr/bin/env node
import { main } from ".";

const { program } = require( "commander" );
const pkg = require( "../package.json" );

const params = program
  .name( "openapi-bundle" )
  .usage( "[options]" )
  .version( pkg.version )
  .requiredOption( "-i, --inputDir <value>", "Directory containing OpenAPI specifications" )
  .requiredOption( "-o, --outFile <value>", "Output file containing the merged OpenAPI specification" )
  .parse( process.argv )
  .opts();

main( params.inputDir, params.outFile )
  .catch( e => {
    console.error( "An uncaught exception was thrown", e );
  } );