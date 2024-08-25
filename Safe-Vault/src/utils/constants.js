import {Image} from 'react-native';
import DAI from '../assets/logos/dai.png';
import OETH from '../assets/logos/opt.png';
import BNB from '../assets/logos/bnb.png';
import ETH from '../assets/logos/eth.png';
import BASE from '../assets/logos/base.png';
import AETH from '../assets/logos/arb.png';
import AVAX from '../assets/logos/avax.png';
import WETH from '../assets/logos/weth.png';
import CELO from '../assets/logos/celo.png';
import MATIC from '../assets/logos/matic.png';
import USDC from '../assets/logos/usdc.png';
import USDT from '../assets/logos/usdt.png';
import SCROLL from '../assets/logos/scroll.png';

const w = 50;
const h = 50;

export const refreshRate = 1000 * 60;

export const iconsBlockchain = {
  dai: <Image source={DAI} style={{width: w, height: h, borderRadius: 10}} />,
  celo: <Image source={CELO} style={{width: w, height: h, borderRadius: 10}} />,
  eth: <Image source={ETH} style={{width: w, height: h, borderRadius: 10}} />,
  aeth: <Image source={AETH} style={{width: w, height: h, borderRadius: 10}} />,
  oeth: <Image source={OETH} style={{width: w, height: h, borderRadius: 10}} />,
  beth: <Image source={BASE} style={{width: w, height: h, borderRadius: 10}} />,
  avax: <Image source={AVAX} style={{width: w, height: h, borderRadius: 10}} />,
  bnb: <Image source={BNB} style={{width: w, height: h, borderRadius: 10}} />,
  matic: (
    <Image source={MATIC} style={{width: w, height: h, borderRadius: 10}} />
  ),
  usdc: <Image source={USDC} style={{width: w, height: h, borderRadius: 10}} />,
  weth: <Image source={WETH} style={{width: w, height: h, borderRadius: 10}} />,
  scroll: (
    <Image source={SCROLL} style={{width: w, height: h, borderRadius: 10}} />
  ),
  usdt: <Image source={USDT} style={{width: w, height: h, borderRadius: 10}} />,
};

export const blockchains = [
  {
    network: 'Ethereum',
    token: 'ETH',
    chainId: 1,
    blockExplorer: 'https://etherscan.io/',
    rpc: 'https://ethereum-rpc.publicnode.com/',
    iconSymbol: 'eth',
    decimals: 18,
    safeAccountCreation: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    wormholeAddress: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585',
    wormholeChainId: 2,
    batchBalancesAddress: '0x0d29EBC0d84AF212762081e6c3f5993180f7C7cF',
    tokens: [
      {
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.eth,
        coingecko: 'ethereum',
      },
      {
        name: 'USDC',
        symbol: 'USDC',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT',
        symbol: 'USDT',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH',
        symbol: 'WETH',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  },
  {
    network: 'Arbitrum',
    token: 'ETH',
    chainId: 42161,
    blockExplorer: 'https://arbiscan.io/',
    rpc: 'https://arbitrum-one-rpc.publicnode.com/',
    iconSymbol: 'eth',
    decimals: 18,
    safeAccountCreation: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    wormholeAddress: '0x0b2402144Bb366A632D14B83F244D2e0e21bD39c',
    wormholeChainId: 23,
    batchBalancesAddress: '0xd9842bc03662E5d8cAafF9aA91fAF4e43cab816C',
    tokens: [
      {
        name: 'Ethereum (ARB)',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.aeth,
        coingecko: 'ethereum',
      },
      {
        name: 'USDC (ARB)',
        symbol: 'USDC',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT (ARB)',
        symbol: 'USDT',
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH (ARB)',
        symbol: 'WETH',
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  },
  {
    network: 'Avalanche',
    token: 'AVAX',
    chainId: 43114,
    blockExplorer: 'https://snowtrace.io/',
    rpc: 'https://avalanche-c-chain-rpc.publicnode.com/',
    iconSymbol: 'avax',
    decimals: 18,
    safeAccountCreation: '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC',
    wormholeAddress: '0x0b2402144Bb366A632D14B83F244D2e0e21bD39c',
    wormholeChainId: 6,
    batchBalancesAddress: '0xc83bc103229484f40588b5CDE47CbA2A4c312033',
    tokens: [
      {
        name: 'Avalanche',
        symbol: 'AVAX',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.avax,
        coingecko: 'avalanche-2',
      },
      {
        name: 'USDC (AVAX)',
        symbol: 'USDC',
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT (AVAX)',
        symbol: 'USDT',
        address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH (AVAX)',
        symbol: 'WETH',
        address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  },
  {
    network: 'Base',
    token: 'ETH',
    chainId: 8453,
    blockExplorer: 'https://basescan.org/',
    rpc: 'https://base-rpc.publicnode.com/',
    iconSymbol: 'beth',
    decimals: 18,
    safeAccountCreation: '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC',
    wormholeAddress: '0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627',
    wormholeChainId: 30,
    batchBalancesAddress: '0xA0D8A1940e4439e6595B74993Cc49f2d8364f7Ff',
    tokens: [
      // Updated April/19/2024
      {
        name: 'Ethereum (Base)',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.beth,
        coingecko: 'ethereum',
      },
      {
        name: 'USDC (Base)',
        symbol: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT (Base)',
        symbol: 'USDT',
        address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH (Base)',
        symbol: 'WETH',
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  },
  {
    network: 'BSC',
    token: 'BNB',
    chainId: 56,
    blockExplorer: 'https://bscscan.com/',
    rpc: 'https://bsc-rpc.publicnode.com/',
    iconSymbol: 'bnb',
    decimals: 18,
    safeAccountCreation: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    wormholeAddress: '0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7',
    wormholeChainId: 4,
    batchBalancesAddress: '0xE8E54474c7976a90E31f5FB17FB00e3B85dA4D1D',
    tokens: [
      {
        name: 'Binance Coin',
        symbol: 'BNB',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.bnb,
        coingecko: 'binancecoin',
      },
      {
        name: 'USDC (BSC)',
        symbol: 'USDC',
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        decimals: 18,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT (BSC)',
        symbol: 'USDT',
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH (BSC)',
        symbol: 'WETH',
        address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  },
  {
    network: 'Optimism',
    token: 'ETH',
    chainId: 10,
    blockExplorer: 'https://optimistic.etherscan.io/',
    rpc: 'https://optimism-rpc.publicnode.com/',
    iconSymbol: 'oeth',
    decimals: 18,
    safeAccountCreation: '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC',
    wormholeAddress: '0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b',
    wormholeChainId: 24,
    batchBalancesAddress: '0xc83bc103229484f40588b5CDE47CbA2A4c312033',
    tokens: [
      {
        name: 'Ethereum (Op)',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.oeth,
        coingecko: 'ethereum',
      },
      {
        name: 'USDC (Op)',
        symbol: 'USDC',
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT (Op)',
        symbol: 'USDT',
        address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH (Op)',
        symbol: 'WETH',
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  },
  {
    network: 'Polygon',
    token: 'MATIC',
    chainId: 137,
    blockExplorer: 'https://polygonscan.com/',
    rpc: 'https://polygon-bor-rpc.publicnode.com/',
    iconSymbol: 'matic',
    decimals: 18,
    safeAccountCreation: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    wormholeAddress: '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE',
    wormholeChainId: 5,
    batchBalancesAddress: '0xc83bc103229484f40588b5CDE47CbA2A4c312033',
    tokens: [
      {
        name: 'Polygon',
        symbol: 'MATIC',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        icon: iconsBlockchain.matic,
        coingecko: 'matic-network',
      },
      {
        name: 'USDC (Matic)',
        symbol: 'USDC',
        address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: 'usd-coin',
      },
      {
        name: 'USDT (Matic)',
        symbol: 'USDT',
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: 'tether',
      },
      {
        name: 'Wrapped ETH (Matic)',
        symbol: 'WETH',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        decimals: 18,
        icon: iconsBlockchain.weth,
        coingecko: 'weth',
      },
    ],
  }
];

// Cloud Account Credentials
export const CloudAccountController =
  '0x72b9EB24BFf9897faD10B3100D35CEE8eDF8E43b';
export const CloudPublicKeyEncryption = `
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAtflt9yF4G1bPqTHtOch47UW9hkSi4u2EZDHYLLSKhGMwvHjajTM+
wcgxV8dlaTh1av/2dWb1EE3UMK0KF3CB3TZ4t/p+aQGhyfsGtBbXZuwZAd8CotTn
BLRckt6s3jPqDNR3XR9KbfXzFObNafXYzP9vCGQPdJQzuTSdx5mWcPpK147QfQbR
K0gmiDABYJMMUos8qaiKVQmSAwyg6Lce8x+mWvFAZD0PvaTNwYqcY6maIztT6h/W
mfQHzt9Z0nwQ7gv31KCw0Tlh7n7rMnDbr70+QVd8e3qMEgDYnx7Jm4BzHjr56IvC
g5atj1oLBlgH6N/9aUIlP5gkw89O3hYJ0QIDAQAB
-----END RSA PUBLIC KEY-----
`;
