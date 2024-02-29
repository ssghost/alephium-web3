/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import {
  node,
  Project,
  Script,
  Contract,
  EventSig,
  Constant,
  Enum,
  StdIdFieldName,
  NetworkId,
  networkIds,
  fromApiVal,
  Val
} from '@alephium/web3'
import * as prettier from 'prettier'
import path from 'path'
import fs from 'fs'
import { Configuration, DEFAULT_CONFIGURATION_VALUES } from './types'
import { getDeploymentFilePath, taskIdToVariable } from './utils'
import { Deployments, DeploymentsPerAddress } from './deployment'

const header = `/* Autogenerated file. Do not edit manually. */\n/* tslint:disable */\n/* eslint-disable */\n\n`

function array(str: string, size: number): string {
  const result = Array(size).fill(str).join(', ')
  return `[${result}]`
}

function parseArrayType(tpe: string): string {
  const ignored = '[;]'
  const tokens: string[] = []
  let acc = ''
  for (let index = 0; index < tpe.length; index++) {
    if (!ignored.includes(tpe.charAt(index))) {
      acc = acc + tpe.charAt(index)
    } else if (acc !== '') {
      tokens.push(acc)
      acc = ''
    }
  }
  const baseTsType = toTsType(tokens[0])
  const sizes = tokens.slice(1).map((str) => parseInt(str))
  return sizes.reduce((acc, size) => array(acc, size), baseTsType)
}

function toTsType(ralphType: string): string {
  switch (ralphType) {
    case 'U256':
    case 'I256':
      return 'bigint'
    case 'Bool':
      return 'boolean'
    case 'Address':
      return 'Address'
    case 'ByteVec':
      return 'HexString'
    default: // array type
      return parseArrayType(ralphType)
  }
}

function formatParameters(fieldsSig: { names: string[]; types: string[] }): string {
  return fieldsSig.names
    .map((name, idx) => (name === StdIdFieldName ? '' : `${name}: ${toTsType(fieldsSig.types[`${idx}`])}`))
    .filter((str) => str !== '')
    .join(', ')
}

function genCallMethod(contractName: string, functionSig: node.FunctionSig): string {
  const funcHasArgs = functionSig.paramNames.length > 0
  const params = `params${funcHasArgs ? '' : '?'}: ${contractName}Types.CallMethodParams<'${functionSig.name}'>`
  const retType = `${contractName}Types.CallMethodResult<'${functionSig.name}'>`
  const callParams = funcHasArgs ? 'params' : 'params === undefined ? {} : params'
  return `
    ${functionSig.name}: async (${params}): Promise<${retType}> => {
      return callMethod(${contractName}, this, "${functionSig.name}", ${callParams}, getContractByCodeHash)
    }
  `
}

function genCallMethods(contract: Contract): string {
  const functions = contract.functions.filter((f) => f.isPublic && f.returnTypes.length > 0)
  if (functions.length === 0) {
    return ''
  }
  return `
    methods = {
      ${functions.map((f) => genCallMethod(contract.name, f)).join(',')}
    }
  `
}

function getInstanceName(contract: Contract): string {
  return `${contract.name}Instance`
}

function genAttach(instanceName: string): string {
  return `
  at(address: string): ${instanceName} {
    return new ${instanceName}(address)
  }
  `
}

function contractTypes(contractName: string): string {
  return `${contractName}Types`
}

function contractFieldType(contractName: string, fieldsSig: node.FieldsSig): string {
  const hasFields = fieldsSig.names.length > 0
  return hasFields ? `${contractTypes(contractName)}.Fields` : '{}'
}

function genFetchState(contract: Contract): string {
  return `
  async fetchState(): Promise<${contractTypes(contract.name)}.State> {
    return fetchContractState(${contract.name}, this)
  }
  `
}

function getEventType(event: EventSig): string {
  return event.name + 'Event'
}

function genEventType(event: EventSig): string {
  if (event.fieldNames.length === 0) {
    return `export type ${getEventType(event)} = Omit<ContractEvent, 'fields'>`
  }
  const fieldsType = `{${formatParameters({ names: event.fieldNames, types: event.fieldTypes })}}`
  return `export type ${getEventType(event)} = ContractEvent<${fieldsType}>`
}

function nodeValToString(value: node.Val): string {
  return valToString(fromApiVal(value, value.type))
}

function valToString(v: Val): string {
  if (typeof v === 'bigint') {
    // use BigInt(...) format to avoid that some projects do not support es2020
    return `BigInt(${v.toString()})`
  } else if (typeof v === 'string') {
    return `"${v}"`
  } else if (Array.isArray(v)) {
    return `[${v.map((e) => valToString(e)).join(',')}]`
  } else {
    return v.toString()
  }
}

function genEventIndex(contract: Contract): string {
  if (contract.eventsSig.length === 0) {
    return ''
  }
  const defs = contract.eventsSig.map((eventSig, index) => `${eventSig.name}: ${index}`).join(',')
  return `eventIndex = { ${defs} }`
}

function genConsts(contract: Contract): string {
  const constants = genConstants(contract.constants)
  const enums = genEnums(contract.enums)
  const constDefs = constants.concat(enums)
  if (constDefs.length === 0) {
    return ''
  }
  return `consts = { ${constDefs.join(',')} }`
}

function genConstants(constants: Constant[]): string[] {
  return constants.map((constant) => `${constant.name}: ${nodeValToString(constant.value)}`)
}

function genEnum(enumDef: Enum): string {
  const fields = enumDef.fields.map((field) => `${field.name}: ${nodeValToString(field.value)}`).join(',')
  return `${enumDef.name}: { ${fields} }`
}

function genEnums(enums: Enum[]): string[] {
  return enums.map((enumDef) => genEnum(enumDef))
}

function genGetContractEventsCurrentCount(contract: Contract): string {
  if (contract.eventsSig.length === 0) {
    return ''
  }
  return `
    async getContractEventsCurrentCount(): Promise<number> {
      return getContractEventsCurrentCount(this.address)
    }
  `
}

function genSubscribeEvent(contractName: string, event: EventSig): string {
  const eventType = getEventType(event)
  const scopedEventType = `${contractTypes(contractName)}.${eventType}`
  return `
    subscribe${eventType}(options: EventSubscribeOptions<${scopedEventType}>, fromCount?: number): EventSubscription {
      return subscribeContractEvent(${contractName}.contract, this, options, "${event.name}", fromCount)
    }
  `
}

function genSubscribeAllEvents(contract: Contract): string {
  if (contract.eventsSig.length <= 1) {
    return ''
  }
  const eventTypes = contract.eventsSig.map((e) => `${contractTypes(contract.name)}.${getEventType(e)}`).join(' | ')
  return `
    subscribeAllEvents(options: EventSubscribeOptions<${eventTypes}>, fromCount?: number): EventSubscription {
      return subscribeContractEvents(${contract.name}.contract, this, options, fromCount)
    }
  `
}

function genGetInitialFieldsWithDefaultValues(contract: Contract): string {
  const fieldsSig = getContractFields(contract)
  if (fieldsSig.names.length === 0) {
    return ''
  }
  return `
    getInitialFieldsWithDefaultValues() {
      return this.contract.getInitialFieldsWithDefaultValues() as ${contract.name}Types.Fields
    }
  `
}

function genContractStateType(contract: Contract): string {
  if (contract.fieldsSig.names.length === 0) {
    return `export type State = Omit<ContractState<any>, 'fields'>`
  }
  return `
    export type Fields = {
      ${formatParameters(contract.fieldsSig)}
    }

    export type State = ContractState<Fields>
  `
}

function genTestMethod(contractName: string, fieldsSig: node.FieldsSig, functionSig: node.FunctionSig): string {
  const funcHasArgs = functionSig.paramNames.length > 0
  const contractHasFields = fieldsSig.names.length > 0
  const argsType = funcHasArgs
    ? `{${formatParameters({ names: functionSig.paramNames, types: functionSig.paramTypes })}}`
    : 'never'
  const fieldsType = contractHasFields ? `${contractFieldType(contractName, fieldsSig)}` : 'never'
  const params =
    funcHasArgs && contractHasFields
      ? `params: TestContractParams<${fieldsType}, ${argsType}>`
      : funcHasArgs
      ? `params: Omit<TestContractParams<${fieldsType}, ${argsType}>, 'initialFields'>`
      : contractHasFields
      ? `params: Omit<TestContractParams<${fieldsType}, ${argsType}>, 'testArgs'>`
      : `params?: Omit<TestContractParams<${fieldsType}, ${argsType}>, 'testArgs' | 'initialFields'>`
  const tsReturnTypes = functionSig.returnTypes.map((tpe) => toTsType(tpe))
  const retType =
    tsReturnTypes.length === 0
      ? `TestContractResult<null>`
      : tsReturnTypes.length === 1
      ? `TestContractResult<${tsReturnTypes[0]}>`
      : `TestContractResult<[${tsReturnTypes.join(', ')}]>`
  const callParams = funcHasArgs || contractHasFields ? 'params' : 'params === undefined ? {} : params'
  return `
    ${functionSig.name}: async (${params}): Promise<${retType}> => {
      return testMethod(this, "${functionSig.name}", ${callParams})
    }
  `
}

function genTestMethods(contract: Contract, fieldsSig: node.FieldsSig): string {
  return `
    tests = {
      ${contract.functions.map((f) => genTestMethod(contract.name, fieldsSig, f)).join(',')}
    }
  `
}

function genCallMethodTypes(contract: Contract): string {
  const entities = contract.functions
    .filter((functionSig) => functionSig.isPublic && functionSig.returnTypes.length > 0)
    .map((functionSig) => {
      const funcHasArgs = functionSig.paramNames.length > 0
      const params = funcHasArgs
        ? `CallContractParams<{${formatParameters({
            names: functionSig.paramNames,
            types: functionSig.paramTypes
          })}}>`
        : `Omit<CallContractParams<{}>, 'args'>`
      const tsReturnTypes = functionSig.returnTypes.map((tpe) => toTsType(tpe))
      const retType =
        tsReturnTypes.length === 0
          ? `CallContractResult<null>`
          : tsReturnTypes.length === 1
          ? `CallContractResult<${tsReturnTypes[0]}>`
          : `CallContractResult<[${tsReturnTypes.join(', ')}]>`
      return `
      ${functionSig.name}: {
        params: ${params}
        result: ${retType}
      }
    `
    })
  return entities.length > 0
    ? `
      export interface CallMethodTable{
        ${entities.join(',')}
      }
      export type CallMethodParams<T extends keyof CallMethodTable> = CallMethodTable[T]['params']
      export type CallMethodResult<T extends keyof CallMethodTable> = CallMethodTable[T]['result']
      export type MultiCallParams = Partial<{ [Name in keyof CallMethodTable]: CallMethodTable[Name]['params'] }>
      export type MultiCallResults<T extends MultiCallParams> = { [MaybeName in keyof T]: MaybeName extends keyof CallMethodTable ? CallMethodTable[MaybeName]['result'] : undefined }
    `
    : ''
}

function genMulticall(contract: Contract): string {
  const types = contractTypes(contract.name)
  const supportMulticall =
    contract.functions.filter((functionSig) => functionSig.isPublic && functionSig.returnTypes.length > 0).length > 0
  return supportMulticall
    ? `
      async multicall<Calls extends ${types}.MultiCallParams>(
        calls: Calls
      ): Promise<${types}.MultiCallResults<Calls>> {
        return (await multicallMethods(${contract.name}, this, calls, getContractByCodeHash)) as ${types}.MultiCallResults<Calls>
      }
    `
    : ''
}

function toUnixPath(p: string): string {
  return p.split(path.sep).join(path.posix.sep)
}

function getContractFields(contract: Contract): node.FieldsSig {
  const stdIdFieldIndex = contract.fieldsSig.names.findIndex((name) => name === StdIdFieldName)
  if (stdIdFieldIndex === -1) {
    return contract.fieldsSig
  }
  return {
    names: contract.fieldsSig.names.filter((_, index) => index !== stdIdFieldIndex),
    types: contract.fieldsSig.types.filter((_, index) => index !== stdIdFieldIndex),
    isMutable: contract.fieldsSig.isMutable.filter((_, index) => index !== stdIdFieldIndex)
  }
}

function genContract(contract: Contract, artifactRelativePath: string): string {
  const fieldsSig = getContractFields(contract)
  const projectArtifact = Project.currentProject.projectArtifact
  const contractInfo = projectArtifact.infos.get(contract.name)
  if (contractInfo === undefined) {
    throw new Error(`Contract info does not exist: ${contract.name}`)
  }
  return `
    ${header}

    import {
      Address, Contract, ContractState, TestContractResult, HexString, ContractFactory,
      EventSubscribeOptions, EventSubscription, CallContractParams, CallContractResult,
      TestContractParams, ContractEvent, subscribeContractEvent, subscribeContractEvents,
      testMethod, callMethod, multicallMethods, fetchContractState,
      ContractInstance, getContractEventsCurrentCount
    } from '@alephium/web3'
    import { DeployContractExecutionResult } from '@alephium/cli'
    import { default as ${contract.name}ContractJson } from '../${toUnixPath(artifactRelativePath)}'
    import { getContractByCodeHash } from './contracts'
    import { loadContractInstanceFromDeployments } from './utils'

    // Custom types for the contract
    export namespace ${contract.name}Types {
      ${genContractStateType(contract)}
      ${contract.eventsSig.map((e) => genEventType(e)).join('\n')}
      ${genCallMethodTypes(contract)}
    }

    class Factory extends ContractFactory<${contract.name}Instance, ${contractFieldType(contract.name, fieldsSig)}> {
      ${genGetInitialFieldsWithDefaultValues(contract)}
      ${genEventIndex(contract)}
      ${genConsts(contract)}
      ${genAttach(getInstanceName(contract))}
      ${genTestMethods(contract, fieldsSig)}
    }

    // Use this object to test and deploy the contract
    export const ${contract.name} = new Factory(Contract.fromJson(
      ${contract.name}ContractJson,
      '${contractInfo.bytecodeDebugPatch}',
      '${contractInfo.codeHashDebug}',
    ))

    // Use this class to interact with the blockchain
    export class ${contract.name}Instance extends ContractInstance {
      constructor(address: Address) {
        super(address)
      }

      static in(
        allDeployments: {
          deployerAddress: string,
          contracts: Record<string, DeployContractExecutionResult>
        }[],
        group?: number,
        taskId?: string
      ): ${contract.name}Instance | undefined {
        return loadContractInstanceFromDeployments<${contract.name}Instance>(
          allDeployments,
          '${contract.name}',
          group,
          taskId
        )
      }

      ${genFetchState(contract)}
      ${genGetContractEventsCurrentCount(contract)}
      ${contract.eventsSig.map((e) => genSubscribeEvent(contract.name, e)).join('\n')}
      ${genSubscribeAllEvents(contract)}
      ${genCallMethods(contract)}
      ${genMulticall(contract)}
    }
`
}

function genScript(script: Script): string {
  console.log(`Generating code for script ${script.name}`)
  const fieldsType = script.fieldsSig.names.length > 0 ? `{${formatParameters(script.fieldsSig)}}` : '{}'
  return `export const ${script.name} = new ExecutableScript<${fieldsType}>(Script.fromJson(${script.name}ScriptJson))`
}

function genScripts(outDir: string, artifactDir: string, exports: string[]) {
  exports.push('./scripts')
  const scriptPath = path.join(outDir, 'scripts.ts')
  const scripts = sortByName(Array.from(Project.currentProject.scripts.values()))
  const importArtifacts = Array.from(scripts)
    .map((s) => {
      const artifactPath = s.sourceInfo.getArtifactPath(artifactDir)
      const artifactRelativePath = path.relative(artifactDir, artifactPath)
      return `import { default as ${s.artifact.name}ScriptJson } from '../${toUnixPath(artifactRelativePath)}'`
    })
    .join('\n')
  const scriptsSource = scripts.map((s) => genScript(s.artifact)).join('\n')
  const source = `
    ${header}

    import {
      Address,
      ExecutableScript,
      ExecuteScriptParams,
      ExecuteScriptResult,
      Script,
      SignerProvider,
      HexString
    } from '@alephium/web3'
    ${importArtifacts}

    ${scriptsSource}
  `
  formatAndSaveToFile(scriptPath, source)
}

function genIndexTs(outDir: string, exports: string[]) {
  const indexPath = path.join(outDir, 'index.ts')
  const exportStatements = exports.map((e) => `export * from "${e}"`).join('\n')
  formatAndSaveToFile(indexPath, header + exportStatements)
}

function genContractByCodeHash(outDir: string, contractNames: string[]) {
  const contracts = contractNames.join(',')
  const source = `
    ${header}

    import { Contract, ContractFactory } from '@alephium/web3'
    ${contracts.length === 0 ? '' : `import { ${contracts} } from '.'`}

    let contracts: ContractFactory<any>[] | undefined = undefined
    export function getContractByCodeHash(codeHash: string): Contract {
      if (contracts === undefined) {
        contracts = [${contracts}]
      }
      const c = contracts.find((c) => c.contract.codeHash === codeHash || c.contract.codeHashDebug === codeHash)
      if (c === undefined) {
        throw new Error("Unknown code with code hash: " + codeHash)
      }
      return c.contract
    }
  `
  const filename = 'contracts.ts'
  const sourcePath = path.join(outDir, filename)
  formatAndSaveToFile(sourcePath, source)
}

function genContracts(outDir: string, artifactDir: string, exports: string[]) {
  sortByName(Array.from(Project.currentProject.contracts.values())).forEach((c) => {
    console.log(`Generating code for contract ${c.artifact.name}`)
    exports.push(`./${c.artifact.name}`)
    const filename = `${c.artifact.name}.ts`
    const sourcePath = path.join(outDir, filename)
    const artifactPath = c.sourceInfo.getArtifactPath(artifactDir)
    const artifactRelativePath = path.relative(artifactDir, artifactPath)
    const sourceCode = genContract(c.artifact, artifactRelativePath)
    formatAndSaveToFile(sourcePath, sourceCode)
  })
}

function dedup<T>(array: Array<T>): Array<T> {
  return array.filter((elem, index) => array.indexOf(elem) === index)
}

// For different network ids, contracts deployed may differ.
// For example, some contracts may only be deployed on devnet and not on testnet and mainnet.
// For these contracts, we want to declare them as optional in the type declaration.
// The first array returned contains contracts deployed on all networks,
// and the second array contains contracts not deployed on all networks.
function getFields(arrays: string[][]): [string[], string[]] {
  if (arrays.length === 0) {
    return [[], []]
  }
  const firstArray = arrays[0]
  if (arrays.length === 1) {
    return [firstArray, []]
  }
  const remains = arrays.slice(1)
  const fields = firstArray.filter((elem) => remains.every((arr) => arr.includes(elem)))
  const allElements = dedup(arrays.reduce((a, b) => a.concat(b)))
  const optionalFields = allElements.filter((elem) => !fields.includes(elem))
  return [fields, optionalFields]
}

async function getAllDeployments(config: Configuration): Promise<DeploymentsPerAddress[]> {
  const filePaths = networkIds
    .map((n) => getDeploymentFilePath(config, n))
    .filter((filePath) => fs.existsSync(filePath))
  const allDeployments: DeploymentsPerAddress[] = []
  for (const filePath of filePaths) {
    const deployments = await Deployments.from(filePath)
    if (deployments.deployments.length > 0) {
      allDeployments.push(deployments.deployments[0])
    }
  }
  return allDeployments
}

function genToDeployments(contracts: string[], optionalContracts: string[], allScripts: string[]): string {
  const contractInstances = contracts.map((taskId) => {
    const typeName = getTypeFromTaskId(taskId)
    return `
    ${taskIdToVariable(taskId)}: {
      ...json.contracts['${taskId}'],
      contractInstance: ${typeName}.at(json.contracts['${taskId}'].contractInstance.address)
    }
    `
  })
  const optionalContractInstances = optionalContracts.map((taskId) => {
    const typeName = getTypeFromTaskId(taskId)
    return `
    ${taskIdToVariable(taskId)}: json.contracts['${taskId}'] === undefined ? undefined : {
      ...json.contracts['${taskId}'],
      contractInstance: ${typeName}.at(json.contracts['${taskId}'].contractInstance.address)
    }
    `
  })
  const scripts = allScripts.map((taskId) => `${taskIdToVariable(taskId)}: json.scripts['${taskId}']`).join(',')
  const allContractInstances = contractInstances.concat(optionalContractInstances).join(',')
  return `
    function toDeployments(json: any): Deployments {
      const contracts = { ${allContractInstances} }
      return {
        ...json,
        contracts: contracts as Deployments['contracts'],
        ${allScripts.length > 0 ? `scripts: { ${scripts} }` : ''}
      }
    }
  `
}

function genContractField(taskId: string, optional: boolean): string {
  const typeName = getTypeFromTaskId(taskId)
  const varName = taskIdToVariable(taskId)
  return `${varName}${optional ? '?' : ''}: DeployContractExecutionResult<${typeName}Instance>`
}

function genScriptField(taskId: string, optional: boolean): string {
  const varName = taskIdToVariable(taskId)
  return `${varName}${optional ? '?' : ''}: RunScriptResult`
}

function genDeploymentsType(allDeployments: DeploymentsPerAddress[]): string {
  const allContracts = allDeployments.map((d) => Array.from(d.contracts.keys()))
  const allScripts = allDeployments.map((d) => Array.from(d.scripts.keys()))
  const [contracts, optionalContracts] = getFields(allContracts)
  const [scripts, optionalScripts] = getFields(allScripts)
  const contractFields = contracts.map((taskId) => genContractField(taskId, false)).join('\n')
  const optionalContractFields = optionalContracts.map((taskId) => genContractField(taskId, true)).join('\n')
  const scriptFields = scripts.map((taskId) => genScriptField(taskId, false)).join('\n')
  const optionalScriptFields = optionalScripts.map((taskId) => genScriptField(taskId, true)).join('\n')
  const hasScript = scripts.length > 0 || optionalScripts.length > 0
  return `
    export type Deployments = {
      deployerAddress: string
      contracts: { ${contractFields} \n ${optionalContractFields} }
      ${hasScript ? `scripts: { ${scriptFields} \n ${optionalScriptFields} }` : ''}
    }

    ${genToDeployments(contracts, optionalContracts, [...scripts, ...optionalScripts])}
  `
}

function getRelativePath(config: Configuration, networkId: NetworkId, fromPath: string): string | undefined {
  const deploymentFilePath = getDeploymentFilePath(config, networkId)
  if (!fs.existsSync(path.resolve(deploymentFilePath))) {
    return undefined
  }
  return path.relative(fromPath, deploymentFilePath)
}

function getTypeFromTaskId(taskId: string): string {
  return taskId.split(':')[0]
}

export async function genLoadDeployments(config: Configuration) {
  const tsPath = path.join(config.artifactDir ?? DEFAULT_CONFIGURATION_VALUES.artifactDir, 'ts')
  if (!fs.existsSync(tsPath)) {
    fs.mkdirSync(tsPath, { recursive: true })
  }
  const allDeployments = await getAllDeployments(config)
  const contractInstanceTypes = dedup(
    allDeployments.flatMap((d) => Array.from(d.contracts.keys()).map((taskId) => getTypeFromTaskId(taskId)))
  )
    .map((contractName) => `${contractName}, ${contractName}Instance`)
    .join(',')
  const deploymentsPath = networkIds.map((n) => [n, getRelativePath(config, n, tsPath)])
  const deploymentsExists = deploymentsPath.filter(([, filePath]) => filePath !== undefined)
  const imports = deploymentsExists
    .map(([networkId, relativePath]) => {
      return `import { default as ${networkId}Deployments } from '${relativePath}'`
    })
    .join('\n')
  let selectByNetwork = 'const deployments = '
  deploymentsExists.forEach(([networkId]) => {
    selectByNetwork += `networkId === '${networkId}' ? ${networkId}Deployments : `
  })
  selectByNetwork += 'undefined'
  const source = `
    ${header}

    import { RunScriptResult, DeployContractExecutionResult } from '@alephium/cli'
    import { NetworkId } from '@alephium/web3'
    import { ${contractInstanceTypes} } from '.'
    ${imports}

    ${genDeploymentsType(allDeployments)}

    export function loadDeployments(networkId: NetworkId, deployerAddress?: string): Deployments {
      ${selectByNetwork}
      if (deployments === undefined) {
        throw Error('The contract has not been deployed to the ' + networkId)
      }
      const allDeployments = Array.isArray(deployments) ? deployments : [deployments]
      if (deployerAddress === undefined) {
        if (allDeployments.length > 1) {
          throw Error('The contract has been deployed multiple times on ' + networkId + ', please specify the deployer address')
        } else {
          return toDeployments(allDeployments[0])
        }
      }
      const result = allDeployments.find((d) => d.deployerAddress === deployerAddress)
      if (result === undefined) {
        throw Error('The contract deployment result does not exist')
      }
      return toDeployments(result)
    }
  `
  const deploymentsFilePath = path.join(tsPath, 'deployments.ts')
  formatAndSaveToFile(deploymentsFilePath, source)
}

function formatAndSaveToFile(filepath: string, code: string) {
  const source = prettier.format(code, { parser: 'typescript' })
  fs.writeFileSync(path.resolve(filepath), source, 'utf8')
}

export function sortByName<T extends { artifact: { name: string } }>(artifacts: T[]): T[] {
  return artifacts.sort((a, b) => (a.artifact.name > b.artifact.name ? 1 : -1))
}

function genUtils(outDir: string) {
  const utilsPath = path.join(outDir, 'utils.ts')
  const source = `
    import { ContractInstance, groupOfAddress } from '@alephium/web3'
    import { DeployContractExecutionResult } from '@alephium/cli'

    export function loadContractInstanceFromDeployments<T extends ContractInstance>(
      allDeployments: {
        deployerAddress: string
        contracts: Record<string, DeployContractExecutionResult>
      }[],
      contractName: string,
      group?: number,
      taskId?: string
    ): T | undefined {
      const deployments = group === undefined
        ? allDeployments[0]
        : allDeployments.find((d) => groupOfAddress(d.deployerAddress))
      if (deployments === undefined) {
        return undefined
      }
      const result = taskId === undefined
        ? deployments.contracts[contractName]
        : deployments.contracts[taskId.replace(/[:\-]/g, '_')]
      if (result === undefined) {
        return undefined
      }
      return result.contractInstance as T
    }
  `
  formatAndSaveToFile(utilsPath, header + source)
}

export function codegen(artifactDir: string) {
  const outDirTemp = path.join(artifactDir, 'ts')
  const outDir = path.isAbsolute(outDirTemp) ? outDirTemp : path.resolve(outDirTemp)
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
  fs.mkdirSync(outDir, { recursive: true })

  const exports: string[] = []
  try {
    genUtils(outDir)
    genContracts(outDir, artifactDir, exports)
    const contractNames = exports.map((p) => p.slice(2))
    genContractByCodeHash(outDir, contractNames)
    genScripts(outDir, artifactDir, exports)
    genIndexTs(outDir, exports)
  } catch (error) {
    console.log(`Failed to generate code: ${error}`)
  }
}
