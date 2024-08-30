import Safe, {SafeFactory} from '@safe-global/protocol-kit';
import {ethers} from 'ethers';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  NativeEventEmitter,
  Pressable,
  Text,
  View,
} from 'react-native';
import checkMark from '../assets/checkMark.png';
import {abiERC20} from '../contracts/erc20';
import GlobalStyles, {mainColor, secondaryColor} from '../styles/styles';
import {blockchains, CloudAccountController} from './constants';
import ContextModule from './contextModule';
import {
  balancedSaving,
  epsilonRound,
  findIndexByProperty,
  formatPublicKeyToUint8Array,
  getEncryptedStorageValue,
  percentageSaving,
  setAsyncStorageValue,
} from './utils';
import {abiBridge} from '../contracts/wormBridge';

function getIndexByChain(chain) {
  let counter = 0;
  for (let i = 0; i < blockchains.length; i++) {
    if (i === chain) {
      return counter;
    } else {
      counter += blockchains[i].tokens.length;
    }
  }
  return -1;
}

const baseTransactionsModalState = {
  stage: 0, // 0
  loading: true,
  explorerURL: '',
  approveFlag: false,
  transaction: {
    to: '',
    amount: '0.0',
    tokenSymbol: blockchains[0].tokens[0].symbol,
    gas: '0.0',
    savedAmount: '0.0',
  },
};

class TransactionsModal extends Component {
  constructor(props) {
    super(props);
    this.provider = blockchains.map(
      x => new ethers.providers.JsonRpcProvider(x.rpc),
    );
    this.state = baseTransactionsModalState;
    this.EventEmitter = new NativeEventEmitter();
  }

  static contextType = ContextModule;

  async componentDidUpdate(prevProps) {
    if (prevProps.signer !== this.props.signer) {
      console.log('Signer Ready on TransactionsModal');
    }
  }

  async setStateAsync(value) {
    return new Promise(resolve => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  async checkTransaction() {
    let privateKey = null;
    if (this.context.value.transactionData.walletSelector === 0) {
      privateKey = await getEncryptedStorageValue('privateKey');
    } else if (this.context.value.transactionData.walletSelector === 1) {
      privateKey = await getEncryptedStorageValue('privateKeySavings');
    }
    const tokenIndex = findIndexByProperty(
      blockchains[this.context.value.transactionData.fromChainSelector].tokens,
      'symbol',
      this.context.value.transactionData.tokenSymbol,
    );
    const signer = new ethers.Wallet(
      privateKey,
      this.provider[this.context.value.transactionData.fromChainSelector],
    );
    const gasPrice = await this.provider[
      this.context.value.transactionData.fromChainSelector
    ].getGasPrice();
    let savedAmount = ethers.BigNumber.from(0);
    let gasSavings = ethers.BigNumber.from(0);
    if (this.context.value.transactionData.command === 'transfer') {
      if (
        this.context.value.savingsActive &&
        this.context.value.transactionData.walletSelector === 0 &&
        this.context.value.transactionData.withSavings
      ) {
        let value =
          this.context.value.protocolSelected === 1
            ? balancedSaving(
                this.context.value.transactionData.amount,
                this.context.value.usdConversion[
                  getIndexByChain(
                    this.context.value.transactionData.fromChainSelector,
                  )
                ],
              )
            : percentageSaving(
                this.context.value.transactionData.amount,
                this.context.value.percentage,
              );
        const transaction = {
          from: await signer.getAddress(),
          to: this.context.value.publicKeySavings,
          value: ethers.utils.parseEther(epsilonRound(value, 18).toFixed(18)),
        };
        console.log(transaction);
        savedAmount =
          value *
          this.context.value.usdConversion[
            getIndexByChain(
              this.context.value.transactionData.fromChainSelector,
            )
          ];
        gasSavings = await this.provider[
          this.context.value.transactionData.fromChainSelector
        ].estimateGas(transaction);
      }
      let transaction = null;
      if (
        this.context.value.transactionData.fromChainSelector ===
        this.context.value.transactionData.toChainSelector
      ) {
        if (this.context.value.transactionData.maxFlag) {
          transaction = {
            from: await signer.getAddress(),
            to: this.context.value.transactionData.to,
            value: ethers.BigNumber.from(0),
          };
          const gas = await this.provider[
            this.context.value.transactionData.fromChainSelector
          ].estimateGas(transaction);
          const gasNeeded = gas.mul(gasPrice);
          transaction = {
            from: await signer.getAddress(),
            to: this.context.value.transactionData.to,
            value: ethers.utils
              .parseEther(this.context.value.transactionData.amount.toFixed(18))
              .sub(gasNeeded),
          };
        } else {
          transaction = {
            from: await signer.getAddress(),
            to: this.context.value.transactionData.to,
            value: ethers.utils.parseEther(
              this.context.value.transactionData.amount,
            ),
          };
        }
      } else {
        const contractBridge = new ethers.Contract(
          blockchains[
            this.context.value.transactionData.fromChainSelector
          ].wormholeAddress,
          abiBridge,
          signer,
        );
        if (this.context.value.transactionData.maxFlag) {
          transaction =
            await contractBridge.populateTransaction.wrapAndTransferETH(
              blockchains[this.context.value.transactionData.toChainSelector]
                .wormholeChainId,
              formatPublicKeyToUint8Array(
                this.context.value.transactionData.to,
              ),
              0n,
              0,
              {
                value: ethers.BigNumber.from(0),
              },
            );
          const gas = await this.provider[
            this.context.value.transactionData.fromChainSelector
          ].estimateGas(transaction);
          const gasNeeded = gas.mul(gasPrice);
          transaction =
            await contractBridge.populateTransaction.wrapAndTransferETH(
              blockchains[this.context.value.transactionData.toChainSelector]
                .wormholeChainId,
              formatPublicKeyToUint8Array(
                this.context.value.transactionData.to,
              ),
              0n,
              0,
              {
                value: ethers.utils
                  .parseEther(
                    this.context.value.transactionData.amount.toFixed(18),
                  )
                  .sub(gasNeeded),
              },
            );
        } else {
          transaction =
            await contractBridge.populateTransaction.wrapAndTransferETH(
              blockchains[this.context.value.transactionData.toChainSelector]
                .wormholeChainId,
              formatPublicKeyToUint8Array(
                this.context.value.transactionData.to,
              ),
              0n,
              0,
              {
                value: ethers.utils.parseEther(
                  this.context.value.transactionData.amount,
                ),
              },
            );
        }
      }
      const gas = await this.provider[
        this.context.value.transactionData.fromChainSelector
      ].estimateGas(transaction);
      const gasDisplay = ethers.utils.formatEther(
        gasPrice.mul(gas.add(gasSavings)),
      );
      await this.setStateAsync({
        transaction: {
          to: this.context.value.transactionData.to,
          amount: this.context.value.transactionData.amount,
          gas: gasDisplay,
          tokenSymbol:
            blockchains[this.context.value.transactionData.fromChainSelector]
              .tokens[0].symbol,
          savedAmount,
        },
        loading: false,
        approveFlag: false,
      });
    } else if (this.context.value.transactionData.command === 'transferToken') {
      if (
        this.context.value.savingsActive &&
        this.context.value.transactionData.walletSelector === 0 &&
        this.context.value.transactionData.withSavings
      ) {
        const valueOnUSD =
          this.context.value.transactionData.amount *
          this.context.value.usdConversion[
            getIndexByChain(
              this.context.value.transactionData.fromChainSelector,
            ) + tokenIndex
          ];
        const valueOnETH =
          valueOnUSD /
          this.context.value.usdConversion[
            getIndexByChain(
              this.context.value.transactionData.fromChainSelector,
            )
          ];
        const value =
          this.context.value.protocolSelected === 1
            ? balancedSaving(
                valueOnETH,
                this.context.value.usdConversion[
                  getIndexByChain(
                    this.context.value.transactionData.fromChainSelector,
                  )
                ],
              )
            : percentageSaving(valueOnETH, this.context.value.percentage);
        const transaction = {
          from: await signer.getAddress(),
          to: this.context.value.publicKeySavings,
          value: ethers.utils.parseEther(epsilonRound(value, 18).toFixed(18)),
        };
        console.log(transaction);
        savedAmount =
          value *
          this.context.value.usdConversion[
            getIndexByChain(
              this.context.value.transactionData.fromChainSelector,
            )
          ];
        gasSavings = await this.provider[
          this.context.value.transactionData.fromChainSelector
        ].estimateGas(transaction);
      }
      const contractBridge = new ethers.Contract(
        blockchains[
          this.context.value.transactionData.fromChainSelector
        ].wormholeAddress,
        abiBridge,
        signer,
      );
      const tokenInfo =
        blockchains[this.context.value.transactionData.fromChainSelector]
          .tokens[tokenIndex];
      const tokenContract = new ethers.Contract(
        tokenInfo.address,
        abiERC20,
        this.provider[this.context.value.transactionData.fromChainSelector],
      );
      const amount = ethers.utils.parseUnits(
        this.context.value.transactionData.amount,
        tokenInfo.decimals,
      );
      let transaction = null;
      if (
        this.context.value.transactionData.fromChainSelector ===
        this.context.value.transactionData.toChainSelector
      ) {
        transaction = await tokenContract.populateTransaction.transfer(
          this.context.value.transactionData.to,
          amount,
          {
            from: await signer.getAddress(),
          },
        );
      } else {
        const publicKey = await signer.getAddress();
        const approved = await tokenContract.allowance(
          publicKey,
          blockchains[this.context.value.transactionData.fromChainSelector]
            .wormholeAddress,
        );
        if (approved.lt(amount)) {
          console.log('Approving');
          transaction = await tokenContract.populateTransaction.approve(
            blockchains[this.context.value.transactionData.toChainSelector]
              .wormholeAddress,
            amount,
            {
              from: publicKey,
            },
          );
          this.setState({approveFlag: true});
        } else {
          console.log('Approved');
          transaction = await contractBridge.populateTransaction.transferTokens(
            tokenInfo.address,
            amount,
            blockchains[this.context.value.transactionData.toChainSelector]
              .wormholeChainId,
            formatPublicKeyToUint8Array(this.context.value.transactionData.to),
            0n,
            0,
          );
        }
      }
      const gas = await this.provider[
        this.context.value.transactionData.fromChainSelector
      ].estimateGas(transaction);
      const gasDisplay = ethers.utils.formatEther(
        gasPrice.mul(gas.add(gasSavings)),
      );
      await this.setStateAsync({
        transaction: {
          to: this.context.value.transactionData.to,
          amount: this.context.value.transactionData.amount,
          gas: gasDisplay,
          tokenSymbol: tokenInfo.symbol,
          savedAmount,
        },
        loading: false,
      });
    } else if (this.context.value.transactionData.command === 'createAccount') {
      const safeAccountConfig = {
        owners: [this.context.value.publicKey, CloudAccountController],
        threshold: 1,
      };
      const safe = await Safe.init({
        signer: privateKey,
        provider:
          blockchains[this.context.value.transactionData.fromChainSelector].rpc,
        predictedSafe: {
          safeAccountConfig,
        },
      });
      const transaction = await safe.createSafeDeploymentTransaction();
      const gas = await this.provider[
        this.context.value.transactionData.fromChainSelector
      ].estimateGas(transaction);
      const gasDisplay = ethers.utils.formatEther(gasPrice.mul(gas));
      await this.setStateAsync({
        transaction: {
          to: this.context.value.transactionData.to,
          amount: this.context.value.transactionData.amount,
          gas: gasDisplay,
          tokenSymbol:
            blockchains[this.context.value.transactionData.fromChainSelector]
              .tokens[0].symbol,
        },
        loading: false,
        approveFlag: false,
      });
    } else if (
      this.context.value.transactionData.command === 'redeemWormhole'
    ) {
      const contractBridge = new ethers.Contract(
        blockchains[
          this.context.value.transactionData.fromChainSelector
        ].wormholeAddress,
        abiBridge,
        signer,
      );
      const transaction =
        await contractBridge.populateTransaction.completeTransfer(
          this.context.value.transactionData.vaa,
        );
      const gas = await this.provider[
        this.context.value.transactionData.fromChainSelector
      ].estimateGas(transaction);
      const gasDisplay = ethers.utils.formatEther(gasPrice.mul(gas));
      await this.setStateAsync({
        transaction: {
          to: this.context.value.transactionData.to,
          amount: this.context.value.transactionData.amount,
          gas: gasDisplay,
          tokenSymbol:
            blockchains[this.context.value.transactionData.fromChainSelector]
              .tokens[0].symbol,
        },
        loading: false,
        approveFlag: false,
      });
    }
  }

  async processTransaction() {
    await this.setStateAsync({
      loading: true,
    });
    let privateKey = null;
    const tokenIndex = findIndexByProperty(
      blockchains[this.context.value.transactionData.fromChainSelector].tokens,
      'symbol',
      this.context.value.transactionData.tokenSymbol,
    );
    if (this.context.value.transactionData.walletSelector === 0) {
      privateKey = await getEncryptedStorageValue('privateKey');
    } else if (this.context.value.transactionData.walletSelector === 1) {
      privateKey = await getEncryptedStorageValue('privateKeySavings');
    }
    const signer = new ethers.Wallet(
      privateKey,
      this.provider[this.context.value.transactionData.fromChainSelector],
    );
    if (this.context.value.transactionData.command === 'transfer') {
      if (
        this.context.value.savingsActive &&
        this.context.value.transactionData.walletSelector === 0 &&
        this.context.value.transactionData.withSavings
      ) {
        const value =
          this.context.value.protocolSelected === 1
            ? balancedSaving(
                this.context.value.transactionData.amount,
                this.context.value.usdConversion[
                  getIndexByChain(
                    this.context.value.transactionData.fromChainSelector,
                  )
                ],
              )
            : percentageSaving(
                this.context.value.transactionData.amount,
                this.context.value.percentage,
              );
        const transaction = {
          from: await signer.getAddress(),
          to: this.context.value.publicKeySavings,
          value: ethers.utils.parseEther(value.toFixed(18)),
        };
        console.log(transaction);
        const tx = await signer.sendTransaction(transaction);
        await tx.wait();
      }
      let transaction = null;
      if (
        this.context.value.transactionData.fromChainSelector ===
        this.context.value.transactionData.toChainSelector
      ) {
        if (this.context.value.transactionData.maxFlag) {
          transaction = {
            from: await signer.getAddress(),
            to: this.context.value.transactionData.to,
            value: ethers.BigNumber.from(0),
          };
          const gas = await this.provider[
            this.context.value.transactionData.fromChainSelector
          ].estimateGas(transaction);
          const gasNeeded = gas.mul(gasPrice);
          transaction = {
            from: await signer.getAddress(),
            to: this.context.value.transactionData.to,
            value: ethers.utils
              .parseEther(this.context.value.transactionData.amount.toFixed(18))
              .sub(gasNeeded),
          };
        } else {
          transaction = {
            from: await signer.getAddress(),
            to: this.context.value.transactionData.to,
            value: ethers.utils.parseEther(
              this.context.value.transactionData.amount,
            ),
          };
        }
      } else {
        const contractBridge = new ethers.Contract(
          blockchains[
            this.context.value.transactionData.fromChainSelector
          ].wormholeAddress,
          abiBridge,
          signer,
        );
        if (this.context.value.transactionData.maxFlag) {
          transaction =
            await contractBridge.populateTransaction.wrapAndTransferETH(
              blockchains[this.context.value.transactionData.toChainSelector]
                .wormholeChainId,
              formatPublicKeyToUint8Array(
                this.context.value.transactionData.to,
              ),
              0n,
              0,
              {
                value: ethers.BigNumber.from(0),
              },
            );
          const gas = await this.provider[
            this.context.value.transactionData.fromChainSelector
          ].estimateGas(transaction);
          const gasNeeded = gas.mul(gasPrice);
          transaction =
            await contractBridge.populateTransaction.wrapAndTransferETH(
              blockchains[this.context.value.transactionData.toChainSelector]
                .wormholeChainId,
              formatPublicKeyToUint8Array(
                this.context.value.transactionData.to,
              ),
              0n,
              0,
              {
                value: ethers.utils
                  .parseEther(
                    this.context.value.transactionData.amount.toFixed(18),
                  )
                  .sub(gasNeeded),
              },
            );
        } else {
          transaction =
            await contractBridge.populateTransaction.wrapAndTransferETH(
              blockchains[this.context.value.transactionData.toChainSelector]
                .wormholeChainId,
              formatPublicKeyToUint8Array(
                this.context.value.transactionData.to,
              ),
              0n,
              0,
              {
                value: ethers.utils.parseEther(
                  this.context.value.transactionData.amount,
                ),
              },
            );
        }
      }
      const tx = await signer.sendTransaction(transaction);
      console.log(tx);
      await tx.wait();
      await this.setStateAsync({
        loading: false,
        approveFlag: false,
        explorerURL: `${
          this.context.value.transactionData.fromChainSelector ===
            this.context.value.transactionData.toChainSelector ||
          this.state.approveFlag
            ? blockchains[this.context.value.transactionData.fromChainSelector]
                .blockExplorer
            : 'https://wormholescan.io/#/'
        }tx/${tx.hash}`,
      });
    } else if (this.context.value.transactionData.command === 'transferToken') {
      const contractBridge = new ethers.Contract(
        blockchains[
          this.context.value.transactionData.fromChainSelector
        ].wormholeAddress,
        abiBridge,
        signer,
      );
      const tokenInfo =
        blockchains[this.context.value.transactionData.fromChainSelector]
          .tokens[tokenIndex];
      const tokenContract = new ethers.Contract(
        tokenInfo.address,
        abiERC20,
        this.provider[this.context.value.transactionData.fromChainSelector],
      );
      const amount = ethers.utils.parseUnits(
        this.context.value.transactionData.amount,
        tokenInfo.decimals,
      );
      let transaction = null;
      if (
        this.context.value.transactionData.fromChainSelector ===
        this.context.value.transactionData.toChainSelector
      ) {
        if (
          this.context.value.savingsActive &&
          this.context.value.transactionData.walletSelector === 0 &&
          this.context.value.transactionData.withSavings
        ) {
          const valueOnUSD =
            this.context.value.transactionData.amount *
            this.context.value.usdConversion[
              getIndexByChain(
                this.context.value.transactionData.fromChainSelector,
              ) + tokenIndex
            ];
          const valueOnETH =
            valueOnUSD /
            this.context.value.usdConversion[
              getIndexByChain(
                this.context.value.transactionData.fromChainSelector,
              )
            ];
          const value =
            this.context.value.protocolSelected === 1
              ? balancedSaving(
                  valueOnETH,
                  this.context.value.usdConversion[
                    getIndexByChain(
                      this.context.value.transactionData.fromChainSelector,
                    )
                  ],
                )
              : percentageSaving(valueOnETH, this.context.value.percentage);
          const transaction = {
            from: await signer.getAddress(),
            to: this.context.value.publicKeySavings,
            value: ethers.utils.parseEther(epsilonRound(value, 18).toFixed(18)),
          };
          console.log(transaction);
          const tx = await signer.sendTransaction(transaction);
          await tx.wait();
        }
        transaction = await tokenContract.populateTransaction.transfer(
          this.context.value.transactionData.to,
          amount,
          {
            from: await signer.getAddress(),
          },
        );
      } else {
        const publicKey = await signer.getAddress();
        const approved = await tokenContract.allowance(
          publicKey,
          blockchains[this.context.value.transactionData.fromChainSelector]
            .wormholeAddress,
        );
        if (approved.lt(amount)) {
          console.log('Approving');
          transaction = await tokenContract.populateTransaction.approve(
            blockchains[this.context.value.transactionData.fromChainSelector]
              .wormholeAddress,
            amount,
            {
              from: publicKey,
            },
          );
        } else {
          console.log('Approved');
          if (
            this.context.value.savingsActive &&
            this.context.value.transactionData.walletSelector === 0 &&
            this.context.value.transactionData.withSavings
          ) {
            const valueOnUSD =
              this.context.value.transactionData.amount *
              this.context.value.usdConversion[
                getIndexByChain(
                  this.context.value.transactionData.fromChainSelector,
                ) + tokenIndex
              ];
            const valueOnETH =
              valueOnUSD /
              this.context.value.usdConversion[
                getIndexByChain(
                  this.context.value.transactionData.fromChainSelector,
                )
              ];
            const value =
              this.context.value.protocolSelected === 1
                ? balancedSaving(
                    valueOnETH,
                    this.context.value.usdConversion[
                      getIndexByChain(
                        this.context.value.transactionData.fromChainSelector,
                      )
                    ],
                  )
                : percentageSaving(valueOnETH, this.context.value.percentage);
            const transaction = {
              from: await signer.getAddress(),
              to: this.context.value.publicKeySavings,
              value: ethers.utils.parseEther(
                epsilonRound(value, 18).toFixed(18),
              ),
            };
            console.log(transaction);
            const tx = await signer.sendTransaction(transaction);
            await tx.wait();
          }
          transaction = await contractBridge.populateTransaction.transferTokens(
            tokenInfo.address,
            amount,
            blockchains[this.context.value.transactionData.toChainSelector]
              .wormholeChainId,
            formatPublicKeyToUint8Array(this.context.value.transactionData.to),
            0n,
            0,
          );
        }
      }
      const tx = await signer.sendTransaction(transaction);
      await tx.wait();
      await this.setStateAsync({
        loading: false,
        approveFlag: false,
        explorerURL: `${
          this.context.value.transactionData.fromChainSelector ===
            this.context.value.transactionData.toChainSelector ||
          this.state.approveFlag
            ? blockchains[this.context.value.transactionData.fromChainSelector]
                .blockExplorer
            : 'https://wormholescan.io/#/'
        }tx/${tx.hash}`,
      });
    } else if (this.context.value.transactionData.command === 'createAccount') {
      const safeFactory = await SafeFactory.init({
        provider:
          blockchains[this.context.value.transactionData.fromChainSelector].rpc,
        signer: privateKey,
      });
      const safeAccountConfig = {
        owners: [this.context.value.publicKey, CloudAccountController],
        threshold: 1,
      };
      await safeFactory.deploySafe({
        safeAccountConfig,
        callback: async txHash => {
          console.log(txHash);
          const publicKeyCard = await safeFactory.predictSafeAddress(
            safeAccountConfig,
          );
          let temp = this.context.value.publicKeyCard;
          temp[this.context.value.transactionData.fromChainSelector] =
            publicKeyCard;
          await setAsyncStorageValue({
            publicKeyCard: temp,
          });
          this.context.setValue({
            publicKeyCard: temp,
          });
          await this.setStateAsync({
            loading: false,
            approveFlag: false,
            explorerURL: `${
              blockchains[this.context.value.transactionData.fromChainSelector]
                .blockExplorer
            }tx/${txHash}`,
          });
        },
      });
    } else if (
      this.context.value.transactionData.command === 'redeemWormhole'
    ) {
      const contractBridge = new ethers.Contract(
        blockchains[
          this.context.value.transactionData.fromChainSelector
        ].wormholeAddress,
        abiBridge,
        signer,
      );
      const transaction =
        await contractBridge.populateTransaction.completeTransfer(
          this.context.value.transactionData.vaa,
        );
      const tx = await signer.sendTransaction(transaction);
      await tx.wait();
      await this.setStateAsync({
        loading: false,
        approveFlag: false,
        explorerURL: `${
          blockchains[this.context.value.transactionData.fromChainSelector]
            .blockExplorer
        }tx/${tx.hash}`,
      });
    }
    this.EventEmitter.emit('updateRedeems');
    this.EventEmitter.emit('updateBalances');
  }

  render() {
    const tokenIndex = findIndexByProperty(
      blockchains[this.context.value.transactionData.fromChainSelector].tokens,
      'symbol',
      this.context.value.transactionData.tokenSymbol,
    );
    return (
      <View
        style={{
          flex: 1,
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}>
        <Modal
          visible={this.context.value.isTransactionActive}
          transparent={true}
          onShow={async () => {
            await this.setStateAsync(baseTransactionsModalState);
            await this.checkTransaction();
          }}
          animationType="slide">
          <View
            style={{
              backgroundColor: '#1E2423',
              width: '100%',
              height: '100%',
              borderWidth: 2,
              borderColor: mainColor,
              padding: 20,
              borderRadius: 25,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            {this.state.stage === 0 && (
              <React.Fragment>
                <View style={{width: '100%', gap: 20, alignItems: 'center'}}>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    Transaction:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 26,
                      width: '100%',
                    }}>
                    {this.state.approveFlag
                      ? `Approve ${this.context.value.transactionData.tokenSymbol}`
                      : this.context.value.transactionData.label}
                  </Text>
                  <View
                    style={{
                      backgroundColor: mainColor,
                      height: 1,
                      width: '90%',
                    }}
                  />
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    To Address:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    {this.context.value.transactionData.to.substring(0, 21) +
                      '\n' +
                      this.context.value.transactionData.to.substring(21)}
                  </Text>
                  <View
                    style={{
                      backgroundColor: mainColor,
                      height: 1,
                      width: '90%',
                    }}
                  />
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    Amount:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 24,
                      width: '100%',
                    }}>
                    {this.state.loading ? (
                      'Calculating...'
                    ) : (
                      <Fragment>
                        {epsilonRound(this.state.transaction.amount, 8)}{' '}
                        {this.state.transaction.tokenSymbol}
                        {'\n ( $'}
                        {epsilonRound(
                          this.state.transaction.amount *
                            this.context.value.usdConversion[
                              getIndexByChain(
                                this.context.value.transactionData
                                  .fromChainSelector,
                              ) + tokenIndex
                            ],
                          6,
                        )}
                        {' USD )'}
                      </Fragment>
                    )}
                  </Text>
                  <View
                    style={{
                      backgroundColor: mainColor,
                      height: 1,
                      width: '90%',
                    }}
                  />
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    Gas:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 24,
                      width: '100%',
                    }}>
                    {this.state.loading ? (
                      'Calculating...'
                    ) : (
                      <Fragment>
                        {epsilonRound(this.state.transaction.gas, 8)}{' '}
                        {
                          blockchains[
                            this.context.value.transactionData.fromChainSelector
                          ].token
                        }
                        {'\n ( $'}
                        {epsilonRound(
                          this.state.transaction.gas *
                            this.context.value.usdConversion[
                              getIndexByChain(
                                this.context.value.transactionData
                                  .fromChainSelector,
                              )
                            ],
                          6,
                        )}
                        {' USD )'}
                      </Fragment>
                    )}
                  </Text>
                  <View
                    style={{
                      backgroundColor: mainColor,
                      height: 1,
                      width: '90%',
                    }}
                  />
                  {this.context.value.savingsActive &&
                    this.context.value.transactionData.walletSelector === 0 &&
                    this.context.value.transactionData.withSavings && (
                      <Text
                        style={{
                          textAlign: 'center',
                          color: 'white',
                          fontSize: 20,
                          width: '100%',
                        }}>
                        Saved Amount:{' '}
                        {this.state.loading ? (
                          'Calculating...'
                        ) : (
                          <Fragment>
                            {epsilonRound(
                              this.state.transaction.savedAmount,
                              6,
                            )}
                            {' USD'}
                          </Fragment>
                        )}
                      </Text>
                    )}
                </View>
                <View style={{gap: 10, width: '100%', alignItems: 'center'}}>
                  <Pressable
                    disabled={this.state.loading}
                    style={[
                      GlobalStyles.buttonStyle,
                      this.state.loading ? {opacity: 0.5} : {},
                    ]}
                    onPress={() => {
                      this.setState({
                        loading: true,
                        stage: 1,
                      });
                      this.processTransaction();
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      Execute
                    </Text>
                  </Pressable>
                  <View
                    style={{
                      backgroundColor: mainColor,
                      height: 1,
                      width: '90%',
                    }}
                  />
                  <Pressable
                    style={[
                      GlobalStyles.buttonStyle,
                      {
                        backgroundColor: secondaryColor,
                      },
                    ]}
                    onPress={async () => {
                      this.context.setValue({
                        isTransactionActive: false,
                      });
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </React.Fragment>
            )}
            {this.state.stage === 1 && (
              <React.Fragment>
                <Image
                  source={checkMark}
                  alt="check"
                  style={{width: 200, height: 200}}
                />
                <Text
                  style={{
                    textShadowRadius: 1,
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: this.state.loading ? mainColor : secondaryColor,
                  }}>
                  {this.state.loading ? 'Processing...' : 'Completed!'}
                </Text>
                <View style={{gap: 10, width: '100%', alignItems: 'center'}}>
                  <View
                    style={[
                      GlobalStyles.networkShow,
                      {width: Dimensions.get('screen').width * 0.9},
                    ]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                      }}>
                      <View style={{marginHorizontal: 20}}>
                        <Text style={{fontSize: 20, color: 'white'}}>
                          Transaction
                        </Text>
                        <Text style={{fontSize: 14, color: 'white'}}>
                          eth_sendTransaction
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        marginHorizontal: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <View style={{marginHorizontal: 10}}>
                        {
                          blockchains[
                            this.context.value.transactionData.fromChainSelector
                          ].tokens[tokenIndex].icon
                        }
                      </View>
                      <Text style={{color: 'white'}}>
                        {`${epsilonRound(
                          this.context.value.transactionData.amount,
                          8,
                        )}`}{' '}
                        {this.context.value.transactionData.tokenSymbol}
                      </Text>
                    </View>
                  </View>
                  {this.context.value.savingsActive &&
                    this.context.value.transactionData.walletSelector === 0 &&
                    this.context.value.transactionData.withSavings && (
                      <View
                        style={[
                          GlobalStyles.networkShow,
                          {width: Dimensions.get('screen').width * 0.9},
                        ]}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-around',
                          }}>
                          <View style={{marginHorizontal: 20}}>
                            <Text style={{fontSize: 20, color: 'white'}}>
                              Savings
                            </Text>
                            <Text style={{fontSize: 14, color: 'white'}}>
                              Transfer{' '}
                              {
                                blockchains[
                                  this.context.value.transactionData
                                    .fromChainSelector
                                ].token
                              }
                            </Text>
                          </View>
                        </View>
                        <View
                          style={{
                            marginHorizontal: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <View style={{marginHorizontal: 10}}>
                            {
                              blockchains[
                                this.context.value.transactionData
                                  .fromChainSelector
                              ].tokens[0].icon
                            }
                          </View>
                          <Text style={{color: 'white'}}>
                            {`${epsilonRound(
                              this.state.transaction.savedAmount /
                                this.context.value.usdConversion[
                                  getIndexByChain(
                                    this.context.value.transactionData
                                      .fromChainSelector,
                                  )
                                ],
                              6,
                            )}`}{' '}
                            {
                              blockchains[
                                this.context.value.transactionData
                                  .fromChainSelector
                              ].tokens[0].symbol
                            }
                          </Text>
                        </View>
                      </View>
                    )}
                </View>
                <View style={{gap: 10, width: '100%', alignItems: 'center'}}>
                  <Pressable
                    disabled={this.state.loading}
                    style={[
                      GlobalStyles.buttonStyle,
                      this.state.loading ? {opacity: 0.5} : {},
                    ]}
                    onPress={() => Linking.openURL(this.state.explorerURL)}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: 'white',
                        textAlign: 'center',
                      }}>
                      View on Explorer
                    </Text>
                  </Pressable>
                  <View
                    style={{
                      backgroundColor: mainColor,
                      height: 1,
                      width: '90%',
                    }}
                  />
                  <Pressable
                    style={[
                      GlobalStyles.buttonStyle,
                      {
                        backgroundColor: secondaryColor,
                      },
                      this.state.loading === '' ? {opacity: 0.5} : {},
                    ]}
                    onPress={async () => {
                      this.context.setValue(
                        {
                          isTransactionActive: false,
                        },
                        () => this.setState(baseTransactionsModalState),
                      );
                    }}
                    disabled={this.state.loading}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      Done
                    </Text>
                  </Pressable>
                </View>
              </React.Fragment>
            )}
          </View>
        </Modal>
      </View>
    );
  }
}

export default TransactionsModal;
