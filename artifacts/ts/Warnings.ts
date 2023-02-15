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
  SubscribeOptions,
  EventSubscription,
  CallContractParams,
  CallContractResult,
  TestContractParams,
  ContractEvent,
  subscribeContractCreatedEvent,
  subscribeContractDestroyedEvent,
  subscribeContractEvent,
  subscribeAllEvents,
  testMethod,
  callMethod,
  fetchContractState,
  ContractCreatedEvent,
  ContractDestroyedEvent,
  ContractInstance,
} from "@alephium/web3";
import { default as WarningsContractJson } from "../test/warnings.ral.json";

// Custom types for the contract
export namespace WarningsTypes {
  export type Fields = {
    a: bigint;
    b: bigint;
  };

  export type State = ContractState<Fields>;
}

class Factory extends ContractFactory<WarningsInstance, WarningsTypes.Fields> {
  at(address: string): WarningsInstance {
    return new WarningsInstance(address);
  }

  async testFooMethod(
    params: TestContractParams<WarningsTypes.Fields, { x: bigint; y: bigint }>
  ): Promise<TestContractResult<null>> {
    return testMethod(this, "foo", params);
  }
}

// Use this object to test and deploy the contract
export const Warnings = new Factory(
  Contract.fromJson(
    WarningsContractJson,
    "",
    "9a0c90d67d729a478062d6794cf7b75c27483c50f6fe2ad13c5ed8873ad1fde2"
  )
);

// Use this class to interact with the blockchain
export class WarningsInstance extends ContractInstance {
  constructor(address: Address) {
    super(address);
  }

  async fetchState(): Promise<WarningsTypes.State> {
    return fetchContractState(Warnings, this);
  }

  subscribeContractCreatedEvent(
    options: SubscribeOptions<ContractCreatedEvent>,
    fromCount?: number
  ): EventSubscription {
    return subscribeContractCreatedEvent(this, options, fromCount);
  }

  subscribeContractDestroyedEvent(
    options: SubscribeOptions<ContractDestroyedEvent>,
    fromCount?: number
  ): EventSubscription {
    return subscribeContractDestroyedEvent(this, options, fromCount);
  }

  subscribeAllEvents(
    options: SubscribeOptions<ContractCreatedEvent | ContractDestroyedEvent>,
    fromCount?: number
  ): EventSubscription {
    return subscribeAllEvents(Warnings.contract, this, options, fromCount);
  }
}
