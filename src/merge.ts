/**
 * Copied and adapted from https://github.com/robertmassaioli/openapi-merge/tree/main/packages/openapi-merge-cli
 */

import { Configuration, ConfigurationInput, isConfigurationInputFromFile } from "openapi-merge-cli/dist/data";
import { merge, MergeInput } from "openapi-merge"; // eslint-disable-line
import fs from "fs";
import path from "path";
/* eslint-disable-next-line */
import { isErrorResult, SingleMergeInput } from "openapi-merge/dist/data";
import { Swagger } from "atlassian-openapi"; // eslint-disable-line
import yaml from "js-yaml";
import { readYamlOrJSON } from "openapi-merge-cli/dist/file-loading";

/* eslint-disable-next-line @typescript-eslint/no-var-requires */
class LogWithMillisDiff {
  private prevTime: number;
  private currTime: number;

  constructor() {
    this.prevTime = this.currTime = this.getCurrentTimeMillis();
  }

  public log( input: string ): void {
    this.currTime = this.getCurrentTimeMillis();
    console.log( `${input} (+${this.currTime - this.prevTime}ms)` );
    this.prevTime = this.currTime;
  }

  private getCurrentTimeMillis(): number {
    return new Date().getTime();
  }
}

async function loadOasForInput( basePath: string, input: ConfigurationInput, inputIndex: number, logger: LogWithMillisDiff ): Promise<Swagger.SwaggerV3 | undefined> {
  if ( isConfigurationInputFromFile( input ) ) {
    const fullPath = path.join( basePath, input.inputFile );
    logger.log( `## Loading input ${inputIndex}: ${fullPath}` );
    return (await readYamlOrJSON( await readSpecFileAsString( fullPath ) )) as Swagger.SwaggerV3;
  }
}

async function readSpecFileAsString( filePath: string ): Promise<string> {
  const bundle = require( "@apidevtools/swagger-cli/lib/bundle" );
  const type = path.extname( filePath ).replace( ".", "" );
  return bundle( filePath, { dereference: false, format: 2, wrap: 0, type: type, outfile: null } );
}

type InputConversionErrors = {
  errors: string[];
};

function isString<A extends object>( s: A | string ): s is string {
  return typeof s === "string";
}

function isSingleMergeInput( i: SingleMergeInput | string ): i is SingleMergeInput {
  return typeof i !== "string";
}

async function convertInputs( basePath: string, configInputs: ConfigurationInput[], logger: LogWithMillisDiff ): Promise<MergeInput | InputConversionErrors> {
  const results = await Promise.all( configInputs.map<Promise<SingleMergeInput | string>>( async ( input, inputIndex ) => {
    try {
      const oas = await loadOasForInput( basePath, input, inputIndex, logger );

      const output: SingleMergeInput = {
        // @ts-ignore
        oas,
        pathModification: input.pathModification,
        operationSelection: input.operationSelection,
        description: input.description
      };

      if ( "dispute" in input ) {
        return {
          ...output,
          dispute: input.dispute
        };
      } else if ( "disputePrefix" in input ) {
        return {
          ...output,
          disputePrefix: input.disputePrefix
        };
      }

      return output;
    } catch ( e ) {
      return `Input ${inputIndex}: could not load configuration file. ${e}`;
    }
  } ) );

  const errors = results.filter( isString );

  if ( errors.length > 0 ) {
    return { errors };
  }

  return results.filter( isSingleMergeInput );
}

function isYamlExtension( filePath: string ): boolean {
  const extension = path.extname( filePath );
  return [".yaml", ".yml"].includes( extension );
}

function dumpAsYaml( blob: unknown ): string {
  // Note: The JSON stringify and parse is required to strip the undefined values: https://github.com/nodeca/js-yaml/issues/571
  return yaml.safeDump( JSON.parse( JSON.stringify( blob ) ), { indent: 2 } );
}

function writeOutput( outputFullPath: string, outputSchema: Swagger.SwaggerV3 ): void {
  const fileContents = isYamlExtension( outputFullPath )
    ? dumpAsYaml( outputSchema )
    : JSON.stringify( outputSchema, null, 2 );

  fs.writeFileSync( outputFullPath, fileContents );
}

export async function main( config: Configuration, basePath: string ): Promise<void> {
  const logger = new LogWithMillisDiff();

  logger.log( `## Loaded the configuration: ${config.inputs.length} inputs` );

  const inputs = await convertInputs( basePath, config.inputs, logger );

  if ( "errors" in inputs ) {
    console.error( inputs.errors );
    throw new Error();
  }

  logger.log( `## Loaded the inputs into memory, merging the results.` );

  const mergeResult = merge( inputs );

  if ( isErrorResult( mergeResult ) ) {
    console.error( `Error merging files: ${mergeResult.message} (${mergeResult.type})` );
    throw new Error();
  }

  const outputFullPath = config.output;
  logger.log( `## Inputs merged, writing the results out to '${outputFullPath}'` );

  writeOutput( outputFullPath, mergeResult.output );

  logger.log( `## Finished writing to '${outputFullPath}'` );
}
