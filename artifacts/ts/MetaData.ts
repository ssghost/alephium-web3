/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  Address,
  Contract,
  ContractState,
  TestContractResult,
  HexString,
  ContractFactory,
  EventSubscribeOptions,
  EventSubscription,
  CallContractParams,
  CallContractResult,
  TestContractParams,
  ContractEvent,
  subscribeContractEvent,
  subscribeContractEvents,
  testMethod,
  callMethod,
  multicallMethods,
  fetchContractState,
  ContractInstance,
  getContractEventsCurrentCount,
  Val,
} from "@alephium/web3";
import { default as MetaDataContractJson } from "../test/MetaData.ral.json";
import { getContractByCodeHash } from "./contracts";
import { Balances, MapValue, TokenBalance, AllStructs } from "./types";

// Custom types for the contract
export namespace MetaDataTypes {
  export type State = Omit<ContractState<any>, "fields">;
}

class Factory extends ContractFactory<MetaDataInstance, {}> {
  at(address: string): MetaDataInstance {
    return new MetaDataInstance(address);
  }

  tests = {
    foo: async (
      params?: Omit<
        TestContractParams<never, never>,
        "testArgs" | "initialFields"
      >
    ): Promise<TestContractResult<null, {}>> => {
      return testMethod(this, "foo", params === undefined ? {} : params);
    },
    bar: async (
      params?: Omit<
        TestContractParams<never, never>,
        "testArgs" | "initialFields"
      >
    ): Promise<TestContractResult<null, {}>> => {
      return testMethod(this, "bar", params === undefined ? {} : params);
    },
    baz: async (
      params?: Omit<
        TestContractParams<never, never>,
        "testArgs" | "initialFields"
      >
    ): Promise<TestContractResult<null, {}>> => {
      return testMethod(this, "baz", params === undefined ? {} : params);
    },
  };
}

// Use this object to test and deploy the contract
export const MetaData = new Factory(
  Contract.fromJson(
    MetaDataContractJson,
    "",
    "cade0de390b8e15960b263ac35aa013cb84f844bce6e3e53e6bfe2cc9166623f",
    AllStructs
  )
);

// Use this class to interact with the blockchain
export class MetaDataInstance extends ContractInstance {
  constructor(address: Address) {
    super(address);
  }

  async fetchState(): Promise<MetaDataTypes.State> {
    return fetchContractState(MetaData, this);
  }
}
