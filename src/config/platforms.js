import blinkitLogo from '../assets/logos/blinkit.png';
import zeptoLogo from '../assets/logos/zepto.png';
import jiomartLogo from '../assets/logos/jiomart.jpg';
import amazonLogo from '../assets/logos/amazon.png';
import bigbasketLogo from '../assets/logos/bigbasket.png';
import swiggyLogo from '../assets/logos/swiggy.png';
import flipkartLogo from '../assets/logos/flipkart.png';

const SHARED = {
  masterPO: 'master_po',
  dispatches: 'truck_dispatches',
  poFilterColumn: 'format',
  weightColumn: 'total_order_liters',
  unitColumn: 'unit_of_measure',
  truckTypes: [
    { label: '10 Ton', capacityKg: 10000 },
    { label: '15 Ton', capacityKg: 15000 },
  ],
};

export const PLATFORMS = {
  blinkit: {
    slug: 'blinkit',
    name: 'Blinkit',
    color: '#f5c518',
    icon: 'B',
    logo: blinkitLogo,
    tables: {
      inventory: 'blinkit_inventory',
      secondarySells: 'blinkitSec',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'blinkit',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'item_id',
    truckTypes: SHARED.truckTypes,
  },
  zepto: {
    slug: 'zepto',
    name: 'Zepto',
    color: '#7b2ff7',
    icon: 'Z',
    logo: zeptoLogo,
    tables: {
      inventory: 'zepto_inventory',
      secondarySells: 'zeptSec',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'zepto',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
    truckTypes: SHARED.truckTypes,
  },
  jiomart: {
    slug: 'jiomart',
    name: 'JioMart',
    color: '#0078ad',
    icon: 'J',
    logo: jiomartLogo,
    tables: {
      inventory: 'jiomart_inventory',
      secondarySells: 'jiomartSec',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'jiomart',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_id',
    truckTypes: SHARED.truckTypes,
  },
  amazon: {
    slug: 'amazon',
    name: 'Amazon',
    color: '#ff9900',
    icon: 'A',
    logo: amazonLogo,
    tables: {
      inventory: 'amazon_inventory',
      secondarySells: 'amazon_sec_daily',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'amazon',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'asin',
    truckTypes: SHARED.truckTypes,
  },
  bigbasket: {
    slug: 'bigbasket',
    name: 'BigBasket',
    color: '#84c225',
    icon: 'BB',
    logo: bigbasketLogo,
    tables: {
      inventory: 'bigbasket_inventory',
      secondarySells: 'bigbasketSec',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'big basket',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_id',
    truckTypes: SHARED.truckTypes,
  },
  swiggy: {
    slug: 'swiggy',
    name: 'Swiggy',
    color: '#fc8019',
    icon: 'S',
    logo: swiggyLogo,
    tables: {
      inventory: 'swiggy_inventory',
      secondarySells: 'swiggySec',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'swiggy',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
    truckTypes: SHARED.truckTypes,
  },
  flipkart: {
    slug: 'flipkart',
    name: 'Flipkart',
    color: '#2874f0',
    icon: 'F',
    logo: flipkartLogo,
    tables: {
      inventory: 'all_platform_inventory',
      secondarySells: 'flipkartSec',
      masterPO: SHARED.masterPO,
      dispatches: SHARED.dispatches,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'flipkart',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
    truckTypes: SHARED.truckTypes,
  },
};

export function getPlatformConfig(slug) {
  return PLATFORMS[slug] || null;
}

export function getAllPlatforms() {
  return Object.values(PLATFORMS);
}
