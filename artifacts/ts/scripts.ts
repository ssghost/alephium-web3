/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  Address,
  ExecutableScript,
  ExecuteScriptParams,
  ExecuteScriptResult,
  Script,
  SignerProvider,
  HexString,
} from "@alephium/web3";
import { default as DestroyAddScriptJson } from "../add/DestroyAdd.ral.json";
import { default as GreeterMainScriptJson } from "../greeter/GreeterMain.ral.json";
import { default as InsertIntoMapScriptJson } from "../test/InsertIntoMap.ral.json";
import { default as MainScriptJson } from "../add/Main.ral.json";
import { default as MintNFTTestScriptJson } from "../nft/MintNFTTest.ral.json";
import { default as RemoveFromMapScriptJson } from "../test/RemoveFromMap.ral.json";
import { default as TemplateArrayVarScriptJson } from "../test/TemplateArrayVar.ral.json";
import { default as TestAssertScriptJson } from "../test/TestAssert.ral.json";
import { default as UpdateMapValueScriptJson } from "../test/UpdateMapValue.ral.json";
import { default as UpdateUserAccountScriptJson } from "../test/UpdateUserAccount.ral.json";
import { default as WithdrawNFTCollectionTestScriptJson } from "../nft/WithdrawNFTCollectionTest.ral.json";
import { Balances, MapValue, TokenBalance, AllStructs } from "./types";

export const DestroyAdd = new ExecutableScript<{
  add: HexString;
  caller: Address;
}>(Script.fromJson(DestroyAddScriptJson, "", AllStructs));

export const GreeterMain = new ExecutableScript<{
  greeterContractId: HexString;
}>(Script.fromJson(GreeterMainScriptJson, "", AllStructs));

export const InsertIntoMap = new ExecutableScript<{
  mapTest: HexString;
  from: Address;
  value: MapValue;
}>(Script.fromJson(InsertIntoMapScriptJson, "", AllStructs));

export const Main = new ExecutableScript<{ addContractId: HexString }>(
  Script.fromJson(MainScriptJson, "", AllStructs)
);

export const MintNFTTest = new ExecutableScript<{
  nftCollectionContractId: HexString;
  uri: HexString;
  royalty: boolean;
}>(Script.fromJson(MintNFTTestScriptJson, "", AllStructs));

export const RemoveFromMap = new ExecutableScript<{
  mapTest: HexString;
  key: Address;
}>(Script.fromJson(RemoveFromMapScriptJson, "", AllStructs));

export const TemplateArrayVar = new ExecutableScript<{
  address: Address;
  numbers0: [[bigint, bigint], [bigint, bigint]];
  bytes: HexString;
  numbers1: [bigint, bigint, bigint];
}>(Script.fromJson(TemplateArrayVarScriptJson, "", AllStructs));

export const TestAssert = new ExecutableScript<{ assert: HexString }>(
  Script.fromJson(TestAssertScriptJson, "", AllStructs)
);

export const UpdateMapValue = new ExecutableScript<{
  mapTest: HexString;
  key: Address;
}>(Script.fromJson(UpdateMapValueScriptJson, "", AllStructs));

export const UpdateUserAccount = new ExecutableScript<{
  account: HexString;
  tokens: [TokenBalance, TokenBalance];
  address: Address;
}>(Script.fromJson(UpdateUserAccountScriptJson, "", AllStructs));

export const WithdrawNFTCollectionTest = new ExecutableScript<{
  collection: HexString;
  amount: bigint;
}>(Script.fromJson(WithdrawNFTCollectionTestScriptJson, "", AllStructs));
