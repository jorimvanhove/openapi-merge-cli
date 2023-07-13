import * as fs from "fs";
import * as path from "path";
import { Configuration, ConfigurationInput } from "openapi-merge-cli/dist/data";

import { main as mergeCli } from "./merge";

const excludes = ["_merged_spec.yaml"];

const listFilesRecursive = ( dirPath: string, fileExtension: string, excludes: string[] ): string[] => {
  const results: string[] = [];

  function traverse( currentDirPath: string ): void {
    const files = fs.readdirSync( currentDirPath );
    for( const file of files ) {
      const filePath = path.join( currentDirPath, file );
      const stat = fs.statSync( filePath );
      if ( stat.isDirectory() ) {
        traverse( filePath );
      } else if ( path.extname( filePath ) === fileExtension && excludes.filter( e => path.basename( filePath ) === e ).length === 0 ) {
        results.push( path.relative( dirPath, filePath ) );
      }
    }
  }

  traverse( dirPath );
  return results;
};

export async function main( dirPath: string, outFile: string ): Promise<void> {
  const specFiles = listFilesRecursive( dirPath, ".yaml", excludes );

  const mergeConfig = {
    "inputs": specFiles.map( f => {
      return { "inputFile": f } as ConfigurationInput;
    } ),
    "output": outFile
  } as Configuration;

  await mergeCli( mergeConfig, dirPath );

  const validate = require( "@apidevtools/swagger-cli/lib/validate" );
  await validate( outFile );
}