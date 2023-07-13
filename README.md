# openapi-merge-cli

This tool is based on the [![npm](https://img.shields.io/npm/v/openapi-merge-cli?label=openapi-merge-cli&logo=npm)](https://www.npmjs.com/package/openapi-merge-cli) tool and underlying [![npm](https://img.shields.io/npm/v/openapi-merge?label=openapi-merge&logo=npm)](https://bit.ly/2WnIytF) library.
Please refer to their respective READMEs
[here](https://github.com/robertmassaioli/openapi-merge/blob/main/packages/openapi-merge-cli/README.md) and [here](https://github.com/robertmassaioli/openapi-merge/tree/main/packages/openapi-merge) for more details on how the merging algorithm works.

## Limitations of the original tool

The orginal [![npm](https://img.shields.io/npm/v/openapi-merge-cli?label=openapi-merge-cli&logo=npm)](https://www.npmjs.com/package/openapi-merge-cli) tool has some limitations that this implementation tries to address:

- requires a configuration file on disk.
- paths to input files & output file declared in the configuration file are assumed to be relative to the configuration file path
- the merging algorithm does not resolve `$ref`'s to external files. (see also [#48](https://github.com/robertmassaioli/openapi-merge/issues/48))

Specifically for this last limitation, this implementation imports functionality of [![npm](https://img.shields.io/npm/v/swagger-cli?label=swagger-cli&logo=npm)](https://www.npmjs.com/package/swagger-cli) that bundles all external `$ref`'s into the source files before merging the OpenAPI
specifications into a single specifiation. This operation happens in-memory, during file read.

This CLI command accepts options for input directory (`-i --inputDir`) and output file (`-o --outfile`), and does not require a static configuration file on disk. The tool will **recursively** search for `.yaml` files in the provided input directory (`inputDir`).

NOTE: The drawback of this approach is that configurability of the merging algorithm is significantly reduced compared to the original tool.

## Merging Behaviour

We process the inputs sequentially such that the first input in the list takes preference and subsequent inputs will be
modified to merge seamlessly into the first.

For some parts of the OpenAPI file, like `paths`, `components` and `tags` we attempt to merge the definitions together
such that there are no overlaps and no information is dropped.

However, for other elements of the OpenAPI files, the algorithm simply takes the value that is first defined in the list of
OpenAPI files. Examples of elements of the OpenAPI files that follow this pattern are:

- Info
- Servers
- Security Schemes
- ExternalDocumentation

The intention here is that the first file will define these elements and effectively override them from the other files.

During merging, files in `inputDir` are sorted alphabetically (desc), so make sure that the file you want to be used as base is named appropriately (eg. `_base.yaml` or `_main.yaml` )

## Getting started

In order to use this merging cli tool you need to have one or more OpenAPI 3.0 files that you wish to merge.

Run the following command to install the required dependencies and run the CLI command:

```bash
yarn && yarn start -i {path-to-spec-files} -o {output-file-path}
```

## Options

```bash
Usage: openapi-bundle [options]

Options:
  -V, --version           output the version number
  -i, --inputDir <value>  Directory containing OpenAPI specifications
  -o, --outFile <value>   Output file containing the merged OpenAPI specification
  -h, --help              display help for command
```

Both `inputDir` and `outFile` can be relative or absolute paths, with no correlation between the two.

## Packaging

Vercel's [![npm](https://img.shields.io/npm/v/pkg?label=pkg&logo=npm)](https://www.npmjs.com/package/pkg) is used to package the CLI tool into an executable, that can be run without Node. Currently, only packaging to `alpine` is implemented. Check out the `package:alpine` script in  `package.json` for more details.

