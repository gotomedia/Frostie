import React from 'react';
import { Beef, Fish, Snowflake, IceCream2, CableIcon as VegetableIcon, Milk } from 'lucide-react';

export type TipCategory = 'meat' | 'dairy' | 'vegetables' | 'general' | 'seafood' | 'dessert';

export interface FreezerTip {
  id: number;
  title: string;
  content: string;
  category: TipCategory;
}

export const freezerTips: FreezerTip[] = [
  {
    id: 1,
    title: "Organize by zones",
    content: "Divide your freezer into zones for different food types: meat, vegetables, leftovers, etc. This makes items easier to find and reduces freezer door open time.",
    category: "general"
  },
  {
    id: 2,
    title: "Prevent freezer burn",
    content: "Use airtight containers or freezer bags with air removed. Double wrap foods with strong odors, and freeze items flat for quicker freezing and easier stacking.",
    category: "general"
  },
  {
    id: 3,
    title: "Label everything clearly",
    content: "Always label items with name, date frozen, and estimated expiration. Use a \"first in, first out\" system by placing newer items behind older ones to reduce food waste.",
    category: "general"
  },
  {
    id: 4,
    title: "Butter storage",
    content: "Butter can be frozen for 6-9 months while maintaining good quality. Wrap it well in foil or freezer wrap to prevent it from absorbing other flavors.",
    category: "dairy"
  },
  {
    id: 5,
    title: "Cheese freezing",
    content: "Freeze shredded cheeses like cheddar and mozzarella for 3-4 months. Hard cheeses like parmesan can be frozen up to 6 months.",
    category: "dairy"
  },
  {
    id: 6,
    title: "Dairy caution",
    content: "Not all dairy freezes well. Cottage cheese, cream cheese, and yogurt may separate and become watery when thawed.",
    category: "dairy"
  },
  {
    id: 7,
    title: "Cooked meat storage",
    content: "Cooked meat dishes and leftovers can be frozen for 2-3 months. Store in portion-sized containers for easy reheating.",
    category: "meat"
  },
  {
    id: 8,
    title: "Raw meat freezing",
    content: "Raw beef, pork, and lamb can be frozen for 4-12 months, while ground meat should be used within 3-4 months for best quality.",
    category: "meat"
  },
  {
    id: 9,
    title: "Poultry storage",
    content: "Whole chicken and turkey can be frozen for up to 12 months, while chicken parts like breasts and thighs are best used within 9 months.",
    category: "meat"
  },
  {
    id: 10,
    title: "Seafood freezing",
    content: "Lean fish (cod, flounder, haddock) can be frozen for 6-8 months, while fatty fish (salmon, tuna) are best used within 2-3 months.",
    category: "seafood"
  },
  {
    id: 11,
    title: "Shellfish storage",
    content: "Shrimp and scallops can be frozen for 6-18 months. Cooked shellfish should be used within 1-3 months.",
    category: "seafood"
  },
  {
    id: 12,
    title: "Freezing vegetables",
    content: "Most vegetables can be frozen for 10-12 months. Blanch vegetables before freezing to preserve color, flavor, and nutrients.",
    category: "vegetables"
  },
  {
    id: 13,
    title: "Ice cream storage",
    content: "Store ice cream for up to 6 months. Keep it in the back of the freezer where temperature is most consistent and avoid frequent thawing and refreezing.",
    category: "dessert"
  },
  {
    id: 14,
    title: "Soups and stews",
    content: "Homemade soups and stews can be frozen for 2-3 months. Leave some space at the top of containers to allow for expansion during freezing.",
    category: "general"
  },
  {
    id: 15,
    title: "Milk freezing",
    content: "Milk can be frozen for up to 3 months. The fat may separate when thawed, but a quick shake will recombine it.",
    category: "dairy"
  }
];

export const getCategoryIcon = (category: TipCategory) => {
  switch (category) {
    case 'meat':
      return <Beef size={16} />;
    case 'dairy':
      return <Milk size={16} />;
    case 'vegetables':
      return <VegetableIcon size={16} />;
    case 'seafood':
      return <Fish size={16} />;
    case 'dessert':
      return <IceCream2 size={16} />;
    case 'general':
    default:
      return <Snowflake size={16} />;
  }
};