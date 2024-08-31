# Safe Vault

Safe Vault: Crosschain transactions, smart savings, and SAFE card payments.

<img src="https://i.ibb.co/R9xcjM1/Logo.png">

## Fast Links:

WALLET CODE: [CODE](./Safe-Vault/)

APK APP: [LINK](./SafeVault%20APK/app-release.apk)

VIDEODEMO: [VIDEO](pending...)

# System Diagrams:

Our project has 3 fundamental components and their diagrams are as follows.

## Wormhole Token Bridge:

Este es uno de los componentes fundamentales de nuestro proyecto, ya que buscamos que el realizar un pago o transferencia no tenga ningun impedimento por la chain de origen, gracias a Wormhole podemos realizar crosschain payments, ya sea directamente en la app o con la tarjeta fisica en la terminal.

<img src="https://i.ibb.co/Z8fcWkS/wormhole-4-drawio.png">

#### Compatible Chains:

Todas las chains que son compatibles con Safe Vault son las siguientes, y puedes realizar transferecias directas o crosschain desde cualquiera de ellas como origen y destino.

<img src="https://i.ibb.co/9WfZ9fW/Chains.png">

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [TRANSACTION WITH CARD](./Cloud%20Functions/cardTransaction/index.js)
- [TRANSACTIONS COMPONENT](./SafeVault/src/utils/transactionsModal.js)

## Safe Account:

Being able to use the card to pay with crypto is only possible thanks to [Safe](https://safe.global/wallet) and its Smart Contract Wallets creation service, in addition to being able to integrate all its functions into the wallet through [Safe Protocol SDK](https://docs.safe.global/sdk/protocol-kit) for Javascript. The entire implementation of the creation of the wallet and the card transactions is in the following links.

<img src="https://i.ibb.co/dGS3t50/Safe-Diagram-drawio.png">

Como SAFE es una Account Abstraction deberas desplegarla en cada una de las chains que quieras habilitar para realizar tus pagos, sin embargo al ser compatibles con Wormhole Token Bridge, podras realizar tu pago desde cualquiera de las chains de la app.

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [CREATE CARD](./Cloud%20Functions/createCard/index.js)
- [CARDS TAB](./Safe-Vault/src/screens/main/tabs/tab3.js)
- [TRANSACTIONS COMPONENT](./SafeVault/src/utils/transactionsModal.js)

## Batch Balances Contract:

Este contrato tiene como finalidad mejorar la UI/UX de nuestra aplicacion, ya que mediante una sola llamada de RPC podemos obtener en batch todos los balances de cualquier serie de ERC20 tokens. Este codigo funciona perfectamente con las EOA Wallets y las SAFE Wallets.

<img src="https://i.ibb.co/Y3H4tqz/vlcsnap-2024-08-30-19h41m11s201.png" width="32%"> 

Este contrato esta deplegado en cada una de las redes de nuestra aplicacion:

- Ethererum: [0x0d29EBC0d84AF212762081e6c3f5993180f7C7cF](https://etherscan.io/address/0x0d29EBC0d84AF212762081e6c3f5993180f7C7cF#code)
- Arbitrum: [0xd9842bc03662E5d8cAafF9aA91fAF4e43cab816C](https://arbiscan.io/address/0xd9842bc03662E5d8cAafF9aA91fAF4e43cab816C#code)
- Avalanche: [0xc83bc103229484f40588b5CDE47CbA2A4c312033](https://snowtrace.io/address/0xc83bc103229484f40588b5CDE47CbA2A4c312033/contract/43114/code)
- Base: [0xA0D8A1940e4439e6595B74993Cc49f2d8364f7Ff](https://basescan.org/address/0xA0D8A1940e4439e6595B74993Cc49f2d8364f7Ff#code)
- Binance Smart Chain: [0xE8E54474c7976a90E31f5FB17FB00e3B85dA4D1D](https://bscscan.com/address/0xE8E54474c7976a90E31f5FB17FB00e3B85dA4D1D#code)
- Optimism: [0xc83bc103229484f40588b5CDE47CbA2A4c312033](https://optimistic.etherscan.io/address/0xc83bc103229484f40588b5CDE47CbA2A4c312033#code)
- Polygon: [0xc83bc103229484f40588b5CDE47CbA2A4c312033](https://polygonscan.com/address/0xc83bc103229484f40588b5CDE47CbA2A4c312033#code)

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [CONTRACT BATCH BALANCES](./Contracts/batchBalances.sol)
- [WALLET CODE](./Safe-Vault/src/screens/main/tabs/tab1.js)

# Screens:

SafeVault is a crosschain payments, savings and card solution. Integrated the Safe and Wormhole in a single application.

<img src="https://i.ibb.co/R9xcjM1/Logo.png">

## Wallet:

As a basis for using all Wormhole Contracts and Safe services and resources, we created a simple wallet.

<img src="https://i.ibb.co/Y3H4tqz/vlcsnap-2024-08-30-19h41m11s201.png" width="32%">

In turn, this tab integrates the contract of [Batch Balances](./Safe-Vault/src/contracts/batchTokenBalances.js), which allows us to obtain all the balances of all the ERC20 Tokens in all [Compatible Chains](#compatible-chains) from a single RPC Call this improve the RPC calls and UI for the users.

    async getBatchBalances() {
        ...
        const batchBalancesContracts = blockchains.map(
            (x, i) =>
            new ethers.Contract(
                x.batchBalancesAddress,
                abiBatchTokenBalances,
                this.provider[i],
            ),
        );
        ...
        const tokenBalances = await Promise.all(
            batchBalancesContracts.map(
            (x, i) =>
                x.batchBalanceOf(publicKey, tokensArrays[i]) ??
                ethers.BigNumber.from(0),
            ),
        );
        ...
        return balances;
    }

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [SCREEN CODE](./SafeVault/src/screens/main/tabs/tab1.js)

## Send:

With the send function, we can send native tokens or ERC20 tokens. Like any wallet, we will first see a review of the transaction we are going to make and finally we will execute it if everything is correct.

<img src="https://i.ibb.co/6Zc7Pf3/Screenshot-20240830-194453.png" width="32%"> <img src="https://i.ibb.co/GnT8v9c/Screenshot-20240830-194437.png" width="32%"> <img src="https://i.ibb.co/ZKpLsDh/Screenshot-20240830-194502.png" width="32%">

NOTA: es importante aclarar que las tranferencias crosschain se hacen a travez de [Wormhole Bridge](https://wormhole.com/), asi que pueden tener un pequeño costo adicional por las Gas Fees y aun mas si se utilizan [Automatic Relayers](https://docs.wormhole.com/wormhole/explore-wormhole/relayer) ya que las comisiones de la transaccion seran pagadas por el Sender.

All transactions are executed in the following component.

- [SCREEN CODE](./SafeVault/src/screens/sendWallet/sendWallet.js)
- [CODE TRANSACTIONS](./SafeVault/src/utils/transactionsModal.js)

## Receive:

With this screen, you can easily show your Wallet to receive funds, whether native tokens or ERC20.

<img src="https://i.ibb.co/0VF7ccT/Screenshot-20240830-194510.png" width="32%">

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [SCREEN CODE](./SafeVault/src/screens/depositWallet/depositWallet.js)

## Payment:

In this tab we intend to make it the same as using a traditional POS, this allows us to enter the amount to be charged in American dollars and to be able to make the payment with one of our virtual cards, You need to select the correct network where you want to receive the funds.

<img src="https://i.ibb.co/FmmNw5z/Screenshot-20240830-194515.png" width="32%"> <img src="https://i.ibb.co/P9kq898/Screenshot-20240830-195915.png" width="32%"> <img src="https://i.ibb.co/GVdMJs0/Screenshot-20240830-194522.png
" width="32%">

As you can see, since it is an Safe Account Card, we can review the amount of money it has in all the available tokens to be able to make the payment with any of them, whether it is a native token or ERC20. Incluso gracias a wormhole ni siquiera nos tenemos que preocupar por utilizar la mimsma chain del vendedor, todas la opciones que requieran womrhole se especificaran en la pantalla de seleccion de token.

<img src="https://i.ibb.co/RYWhHy8/Screenshot-20240830-195847.png" width="32%"> <img src="https://i.ibb.co/LS1RbbW/Screenshot-20240830-195905.png" width="32%"> <img src="https://i.ibb.co/cvJvjFX/Screenshot-20240830-195908.png" width="32%">

Finally, if our device has the option to print the purchase receipt, it can be printed immediately.

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [SCREEN CODE](./SafeVault/src/screens/paymentWallet/paymentWallet.js)
- [CARD PAYMENT CODE](./Cloud%20Functions/cardTransaction/index.js)

## Redeems:

Hay ocasiones en las que recibimos transacciones crosschain mediante wormhole y estas no pasan de forma automatica, para estas transacciones tendremos que realizar un Redeem manualemnte, asi que en esta tab podremos revisar todas las transacciones pendientes y redimirlas.

<img src="https://i.ibb.co/NYwvbNB/Screenshot-20240830-194528.png" width="32%">

El proceso para hacer el Reedem se realizar obteniendo el VAA de la transaccion mediante la API de Wormhole y firmando la transaccion en la red de destino.

NOTA: Esta es solo la version simplificada de la API Call que se realiza en la aplicacion, favor de revisar el codigo de esta tab para ver completamente como se realiza el redeem.

    fetch(
        `https://api.wormholescan.io/api/v1/operations?page=0&pageSize=50&sortOrder=DESC&address=${this.context.value.publicKey}`,
        requestOptions,
    )
    .then(response => response.json())
    .then(result => console.log(result))

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [SCREEN CODE](./Safe-Vault/src/screens/redeem/redeem.js)

## Savings:

In the savings section, we can create our savings account, this account is linked to our main wallet account, meaning that our wallet will be the owner of it.

<img src="https://i.ibb.co/S3w3b3f/vlcsnap-2024-08-15-23h05m12s788.png" width="32%"> <img src="https://i.ibb.co/dKZpYB0/vlcsnap-2024-08-15-23h05m01s157.png" width="32%"> <img src="https://i.ibb.co/55jLcds/vlcsnap-2024-08-15-23h05m04s545.png" width="32%">

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [SCREEN CODE](./SafeVault/src/screens/main/tabs/tab2.js)

### Savings Protocol:

- Balanced Protocol, this protocol performs a weighted rounding according to the amount to be paid in the transaction, so that the larger the transaction, the greater the savings, in order not to affect the user.

        export function balancedSavingToken(number, usd1, usd2) {
            const balance = number * usd1;
            let amount = 0;
            if (balance <= 1) {
                amount = 1;
            } else if (balance > 1 && balance <= 10) {
                amount = Math.ceil(balance);
            } else if (balance > 10 && balance <= 100) {
                const intBalance = parseInt(balance, 10);
                const value = parseInt(Math.round(intBalance).toString().slice(-2), 10);
                let unit = parseInt(Math.round(intBalance).toString().slice(-1), 10);
                let decimal = parseInt(Math.round(intBalance).toString().slice(-2, -1), 10);
                if (unit < 5) {
                unit = '5';
                decimal = decimal.toString();
                } else {
                unit = '0';
                decimal = (decimal + 1).toString();
                }
                amount = intBalance - value + parseInt(decimal + unit, 10);
            } else if (balance > 100) {
                const intBalance = parseInt(Math.floor(balance / 10), 10);
                amount = (intBalance + 1) * 10;
            }
            return new Decimal(amount).sub(new Decimal(balance)).div(usd2).toNumber();
        }

- Percentage protocol, unlike the previous protocol, this one aims to always save a percentage selected in the UI.

        export function percentageSaving(number, percentage) {
            return number * (percentage / 100);
        }

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [CODE UTILS](./SafeVault/src/utils/utils.js)

## Cards:

Finally, in the cards section, we can create a virtual card, which will help us make payments without the need for our wallet directly with a physical card in any POS terminal with SafeVault.

<img src="https://i.ibb.co/phQ2MJ3/Screenshot-20240830-194542.png" width="32%"> <img src="https://i.ibb.co/JrzywYD/Screenshot-20240830-194546.png" width="32%"> <img src="https://i.ibb.co/D4Y4ndJ/Screenshot-20240830-194556.png" width="32%">

With a multi-owner smart contract account, the user maintains full ownership and control of their assets, the only way to make payments from this card without the user wallet, is through the physical card. And all transactions are encrypted using SHA256.

    encryptCardData(cardData) {
        const encrypted = Crypto.publicEncrypt(
        {
            key: CloudPublicKeyEncryption,
        },
        Buffer.from(cardData, 'utf8'),
        );
        return encrypted.toString('base64');
    }

NOTA: Como SAFE es una Account Abstraction deberas desplegarla en cada una de las chains que quieras habilitar para realizar tus pagos, sin embargo al ser compatibles con Wormhole Token Bridge, podras realizar tu pago desde cualquiera de las chains de la app.

Toda la implementacion tecnica de esto, esta en los siguientes enlaces:

- [CARD TRANSACTION](./Cloud%20Function/cardTransaction/index.js)
- [SCREEN CODE](./SafeVault/src/utils/transactionsModal.js)
