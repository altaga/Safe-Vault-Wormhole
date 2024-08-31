const functions = require("@google-cloud/functions-framework");
const crypto = require("crypto");
const Firestore = require("@google-cloud/firestore");
const ethers = require("ethers");
const { SafeFactory } = require("@safe-global/protocol-kit");
const { default: Safe } = require("@safe-global/protocol-kit");
const OperationType = require("@safe-global/safe-core-sdk-types");

const privateKey = ``;

const privKey =
  "";

const CloudAccountController = '0x72b9EB24BFf9897faD10B3100D35CEE8eDF8E43b';

const db = new Firestore({
  projectId: "",
  keyFilename: "credential.json",
});

const rpc = [
  "https://ethereum-rpc.publicnode.com/",
  "https://arbitrum-one-rpc.publicnode.com/",
  "https://avalanche-c-chain-rpc.publicnode.com/",
  "https://base-rpc.publicnode.com/",
  "https://bsc-rpc.publicnode.com/",
  "https://optimism-rpc.publicnode.com/",
  "https://polygon-bor-rpc.publicnode.com/",
];
const wormholeAddress = [
  "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
  "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c",
  "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c",
  "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627",
  "0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7",
  "0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b",
  "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE",
];
const wormholeChainId = [2, 23, 6, 30, 4, 24, 5];

const Accounts = db.collection("WormholeCards");

functions.http("helloHttp", async (req, res) => {
  try {
    const fromChain = req.body.fromChain;
    const toChain = req.body.toChain;
    const decrypted = decryptText(req.body.data);
    const toAddress = req.body.toAddress;
    const amount = req.body.amount;
    const tokenAddress = req.body.tokenAddress;
    const query = await Accounts.where(
      "cardHash",
      "==",
      decrypted.toString()
    ).get();
    if (query.empty) {
      throw "Query Empty";
    } else {
      const publicKey = query.docs[0].data().publicKey;
      const safeAccountConfig = {
        owners: [publicKey, CloudAccountController],
        threshold: 1,
      };
      const safeFactory = await SafeFactory.init({
        provider: rpc[fromChain],
        signer: privKey,
      });
      const safeAddress = await safeFactory.predictSafeAddress(
        safeAccountConfig
      );
      const protocolKit = await Safe.init({
        signer: privKey,
        provider: rpc[fromChain],
        safeAddress,
      });
      let transactions;
      const myProvider = new ethers.providers.JsonRpcProvider(rpc[fromChain]);
      if (fromChain === toChain) {
        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
          const value = ethers.utils.parseUnits(amount, "ether").toString();
          transactions = [
            {
              to: toAddress,
              data: "0x",
              value,
              operation: OperationType.Call,
            },
          ];
        } else {
          const contract = new ethers.Contract(
            tokenAddress,
            abiERC20,
            myProvider
          );
          const decimals = await contract.decimals();
          const value = ethers.utils.parseUnits(amount, decimals).toString();
          const data = contract.interface.encodeFunctionData("transfer", [
            toAddress,
            value,
          ]);
          transactions = [
            {
              to: tokenAddress,
              data,
              value: "0x0",
              operation: OperationType.Call,
            },
          ];
        }
      } else {
        const signer = new ethers.Wallet(privKey, myProvider);
        const contractBridge = new ethers.Contract(
          wormholeAddress[fromChain],
          abiBridge,
          signer
        );
        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
            const data = contractBridge.interface.encodeFunctionData("wrapAndTransferETH", [wormholeChainId[toChain], formatPublicKeyToUint8Array(toAddress), 0n, 0]);
            transactions = [
                {
                    to: wormholeAddress[fromChain],
                    data,
                    value:ethers.utils.parseUnits(amount, "ether").toString(),
                    operation: OperationType.Call,
                },
            ];
        } else {
          const contract = new ethers.Contract(
            tokenAddress,
            abiERC20,
            myProvider
          );
          const decimals = await contract.decimals();
          const value = ethers.utils.parseUnits(amount, decimals).toString();
          // Check Allowance
          const approved = await contract.allowance(
            safeAddress,
            wormholeAddress[fromChain]
          );
          if (approved.lt(value)) {
            const data1 = contract.interface.encodeFunctionData("approve", [wormholeAddress[fromChain], value]);
            const data2 = contractBridge.interface.encodeFunctionData("transferTokens", [tokenAddress, value, wormholeChainId[toChain], formatPublicKeyToUint8Array(toAddress), 0n, 0]);
            transactions = [
                {
                    to: tokenAddress,
                    data:data1,
                    value:"0x0",
                    operation: OperationType.Call,
                },
                {
                    to: wormholeAddress[fromChain],
                    data:data2,
                    value:"0x0",
                    operation: OperationType.Call,
                },
            ];
          }
          else{
            const data = contractBridge.interface.encodeFunctionData("transferTokens", [tokenAddress, value, wormholeChainId[toChain], formatPublicKeyToUint8Array(toAddress), 0n, 0]);
            transactions = [
                {
                    to: wormholeAddress[fromChain],
                    data,
                    value:"0x0",
                    operation: OperationType.Call,
                },
            ];
          }
        }
      }
      const safeTransaction = await protocolKit.createTransaction({
        transactions,
      });
      const executeTxResponse = await protocolKit.executeTransaction(
        safeTransaction
      );
      const receipt =
        executeTxResponse.transactionResponse &&
        (await executeTxResponse.transactionResponse.wait());
      res.send(receipt.hash);
    }
  } catch (e) {
    console.log(e);
    res.send(`Bad Request`);
  }
});

function decryptText(encryptedText) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
    },
    Buffer.from(encryptedText, "base64")
  );
}

function formatPublicKeyToUint8Array(publicKey) {
  const cleanedKey = publicKey.toLowerCase().replace(/^0x/, "");
  const paddedKey = cleanedKey.padStart(40, "0");
  const formattedKey = `0x${"0".repeat(24)}${paddedKey}`;
  const uint8Array = new Uint8Array(
    formattedKey
      .slice(2)
      .match(/.{1,2}/g)
      .map((byte) => parseInt(byte, 16))
  );

  return uint8Array;
}

const abiERC20 = [
  {
    inputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'symbol',
        type: 'string',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'subtractedValue',
        type: 'uint256',
      },
    ],
    name: 'decreaseAllowance',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'addedValue',
        type: 'uint256',
      },
    ],
    name: 'increaseAllowance',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

const abiBridge = [
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "previousAdmin",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "newAdmin",
          type: "address",
        },
      ],
      name: "AdminChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "beacon",
          type: "address",
        },
      ],
      name: "BeaconUpgraded",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "oldContract",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newContract",
          type: "address",
        },
      ],
      name: "ContractUpgraded",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint16",
          name: "emitterChainId",
          type: "uint16",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "emitterAddress",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "uint64",
          name: "sequence",
          type: "uint64",
        },
      ],
      name: "TransferRedeemed",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "implementation",
          type: "address",
        },
      ],
      name: "Upgraded",
      type: "event",
    },
    {
      inputs: [],
      name: "WETH",
      outputs: [{ internalType: "contract IWETH", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "_parseTransferCommon",
      outputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "bytes32", name: "to", type: "bytes32" },
            { internalType: "uint16", name: "toChain", type: "uint16" },
            { internalType: "uint256", name: "fee", type: "uint256" },
          ],
          internalType: "struct BridgeStructs.Transfer",
          name: "transfer",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "tokenAddress", type: "address" },
        { internalType: "uint32", name: "nonce", type: "uint32" },
      ],
      name: "attestToken",
      outputs: [{ internalType: "uint64", name: "sequence", type: "uint64" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint16", name: "chainId_", type: "uint16" }],
      name: "bridgeContracts",
      outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "chainId",
      outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVm", type: "bytes" }],
      name: "completeTransfer",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVm", type: "bytes" }],
      name: "completeTransferAndUnwrapETH",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVm", type: "bytes" }],
      name: "completeTransferAndUnwrapETHWithPayload",
      outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVm", type: "bytes" }],
      name: "completeTransferWithPayload",
      outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVm", type: "bytes" }],
      name: "createWrapped",
      outputs: [{ internalType: "address", name: "token", type: "address" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "uint8", name: "decimals", type: "uint8" },
            { internalType: "bytes32", name: "symbol", type: "bytes32" },
            { internalType: "bytes32", name: "name", type: "bytes32" },
          ],
          internalType: "struct BridgeStructs.AssetMeta",
          name: "meta",
          type: "tuple",
        },
      ],
      name: "encodeAssetMeta",
      outputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "bytes32", name: "to", type: "bytes32" },
            { internalType: "uint16", name: "toChain", type: "uint16" },
            { internalType: "uint256", name: "fee", type: "uint256" },
          ],
          internalType: "struct BridgeStructs.Transfer",
          name: "transfer",
          type: "tuple",
        },
      ],
      name: "encodeTransfer",
      outputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "bytes32", name: "to", type: "bytes32" },
            { internalType: "uint16", name: "toChain", type: "uint16" },
            { internalType: "bytes32", name: "fromAddress", type: "bytes32" },
            { internalType: "bytes", name: "payload", type: "bytes" },
          ],
          internalType: "struct BridgeStructs.TransferWithPayload",
          name: "transfer",
          type: "tuple",
        },
      ],
      name: "encodeTransferWithPayload",
      outputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [],
      name: "evmChainId",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "finality",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
      name: "governanceActionIsConsumed",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "governanceChainId",
      outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "governanceContract",
      outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "implementation",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "isFork",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "impl", type: "address" }],
      name: "isInitialized",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
      name: "isTransferCompleted",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "token", type: "address" }],
      name: "isWrappedAsset",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "token", type: "address" }],
      name: "outstandingBridged",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "parseAssetMeta",
      outputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "uint8", name: "decimals", type: "uint8" },
            { internalType: "bytes32", name: "symbol", type: "bytes32" },
            { internalType: "bytes32", name: "name", type: "bytes32" },
          ],
          internalType: "struct BridgeStructs.AssetMeta",
          name: "meta",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "parsePayloadID",
      outputs: [{ internalType: "uint8", name: "payloadID", type: "uint8" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        { internalType: "bytes", name: "encodedRecoverChainId", type: "bytes" },
      ],
      name: "parseRecoverChainId",
      outputs: [
        {
          components: [
            { internalType: "bytes32", name: "module", type: "bytes32" },
            { internalType: "uint8", name: "action", type: "uint8" },
            { internalType: "uint256", name: "evmChainId", type: "uint256" },
            { internalType: "uint16", name: "newChainId", type: "uint16" },
          ],
          internalType: "struct BridgeStructs.RecoverChainId",
          name: "rci",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "parseRegisterChain",
      outputs: [
        {
          components: [
            { internalType: "bytes32", name: "module", type: "bytes32" },
            { internalType: "uint8", name: "action", type: "uint8" },
            { internalType: "uint16", name: "chainId", type: "uint16" },
            { internalType: "uint16", name: "emitterChainID", type: "uint16" },
            {
              internalType: "bytes32",
              name: "emitterAddress",
              type: "bytes32",
            },
          ],
          internalType: "struct BridgeStructs.RegisterChain",
          name: "chain",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "parseTransfer",
      outputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "bytes32", name: "to", type: "bytes32" },
            { internalType: "uint16", name: "toChain", type: "uint16" },
            { internalType: "uint256", name: "fee", type: "uint256" },
          ],
          internalType: "struct BridgeStructs.Transfer",
          name: "transfer",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "parseTransferWithPayload",
      outputs: [
        {
          components: [
            { internalType: "uint8", name: "payloadID", type: "uint8" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
            { internalType: "uint16", name: "tokenChain", type: "uint16" },
            { internalType: "bytes32", name: "to", type: "bytes32" },
            { internalType: "uint16", name: "toChain", type: "uint16" },
            { internalType: "bytes32", name: "fromAddress", type: "bytes32" },
            { internalType: "bytes", name: "payload", type: "bytes" },
          ],
          internalType: "struct BridgeStructs.TransferWithPayload",
          name: "transfer",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encoded", type: "bytes" }],
      name: "parseUpgrade",
      outputs: [
        {
          components: [
            { internalType: "bytes32", name: "module", type: "bytes32" },
            { internalType: "uint8", name: "action", type: "uint8" },
            { internalType: "uint16", name: "chainId", type: "uint16" },
            { internalType: "bytes32", name: "newContract", type: "bytes32" },
          ],
          internalType: "struct BridgeStructs.UpgradeContract",
          name: "chain",
          type: "tuple",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVM", type: "bytes" }],
      name: "registerChain",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVM", type: "bytes" }],
      name: "submitRecoverChainId",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "tokenImplementation",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "token", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "uint16", name: "recipientChain", type: "uint16" },
        { internalType: "bytes32", name: "recipient", type: "bytes32" },
        { internalType: "uint256", name: "arbiterFee", type: "uint256" },
        { internalType: "uint32", name: "nonce", type: "uint32" },
      ],
      name: "transferTokens",
      outputs: [{ internalType: "uint64", name: "sequence", type: "uint64" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "token", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "uint16", name: "recipientChain", type: "uint16" },
        { internalType: "bytes32", name: "recipient", type: "bytes32" },
        { internalType: "uint32", name: "nonce", type: "uint32" },
        { internalType: "bytes", name: "payload", type: "bytes" },
      ],
      name: "transferTokensWithPayload",
      outputs: [{ internalType: "uint64", name: "sequence", type: "uint64" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVm", type: "bytes" }],
      name: "updateWrapped",
      outputs: [{ internalType: "address", name: "token", type: "address" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "bytes", name: "encodedVM", type: "bytes" }],
      name: "upgrade",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "wormhole",
      outputs: [
        { internalType: "contract IWormhole", name: "", type: "address" },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint16", name: "recipientChain", type: "uint16" },
        { internalType: "bytes32", name: "recipient", type: "bytes32" },
        { internalType: "uint256", name: "arbiterFee", type: "uint256" },
        { internalType: "uint32", name: "nonce", type: "uint32" },
      ],
      name: "wrapAndTransferETH",
      outputs: [{ internalType: "uint64", name: "sequence", type: "uint64" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint16", name: "recipientChain", type: "uint16" },
        { internalType: "bytes32", name: "recipient", type: "bytes32" },
        { internalType: "uint32", name: "nonce", type: "uint32" },
        { internalType: "bytes", name: "payload", type: "bytes" },
      ],
      name: "wrapAndTransferETHWithPayload",
      outputs: [{ internalType: "uint64", name: "sequence", type: "uint64" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint16", name: "tokenChainId", type: "uint16" },
        { internalType: "bytes32", name: "tokenAddress", type: "bytes32" },
      ],
      name: "wrappedAsset",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    { stateMutability: "payable", type: "receive" },
  ];