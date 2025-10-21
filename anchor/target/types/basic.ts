/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/basic.json`.
 */
export type Basic = {
  "address": "GUudyUKazJCyL2f7dTG6Nm7EgUsro3acDtbbMWFuUrRd",
  "metadata": {
    "name": "basic",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addComment",
      "discriminator": [
        59,
        175,
        193,
        236,
        134,
        214,
        75,
        141
      ],
      "accounts": [
        {
          "name": "deal"
        },
        {
          "name": "comment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "author"
              },
              {
                "kind": "arg",
                "path": "timestamp"
              }
            ]
          }
        },
        {
          "name": "author",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "content",
          "type": "string"
        }
      ]
    },
    {
      "name": "buyCoupon",
      "discriminator": [
        163,
        156,
        135,
        250,
        4,
        243,
        89,
        98
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true
        },
        {
          "name": "coupon",
          "writable": true
        },
        {
          "name": "sale",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              },
              {
                "kind": "account",
                "path": "coupon.sale_count",
                "account": "coupon"
              }
            ]
          }
        },
        {
          "name": "buyerUsdcAccount",
          "writable": true
        },
        {
          "name": "sellerUsdcAccount",
          "writable": true
        },
        {
          "name": "platformUsdcAccount",
          "writable": true
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "platformWallet"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "claimGroupDealCoupon",
      "discriminator": [
        18,
        111,
        27,
        41,
        20,
        47,
        25,
        197
      ],
      "accounts": [
        {
          "name": "groupDeal"
        },
        {
          "name": "participant",
          "writable": true
        },
        {
          "name": "user",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "claimRewards",
      "discriminator": [
        4,
        144,
        132,
        71,
        116,
        23,
        151,
        80
      ],
      "accounts": [
        {
          "name": "stakedCoupon",
          "writable": true
        },
        {
          "name": "rewardsPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "rewardsPoolUsdcAccount",
          "writable": true
        },
        {
          "name": "stakerUsdcAccount",
          "writable": true
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createDeal",
      "discriminator": [
        198,
        212,
        144,
        151,
        97,
        56,
        149,
        113
      ],
      "accounts": [
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "arg",
                "path": "title"
              }
            ]
          }
        },
        {
          "name": "merchant",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "discountPercent",
          "type": "u8"
        },
        {
          "name": "maxSupply",
          "type": "u64"
        },
        {
          "name": "expiryTimestamp",
          "type": "i64"
        },
        {
          "name": "category",
          "type": "string"
        },
        {
          "name": "priceLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createGroupDeal",
      "discriminator": [
        224,
        6,
        90,
        198,
        152,
        131,
        64,
        180
      ],
      "accounts": [
        {
          "name": "deal"
        },
        {
          "name": "groupDeal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  114,
                  111,
                  117,
                  112,
                  95,
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "targetParticipants",
          "type": "u32"
        },
        {
          "name": "tier1Threshold",
          "type": "u32"
        },
        {
          "name": "tier1Discount",
          "type": "u8"
        },
        {
          "name": "tier2Threshold",
          "type": "u32"
        },
        {
          "name": "tier2Discount",
          "type": "u8"
        },
        {
          "name": "tier3Threshold",
          "type": "u32"
        },
        {
          "name": "tier3Discount",
          "type": "u8"
        },
        {
          "name": "expiryTimestamp",
          "type": "i64"
        },
        {
          "name": "priceLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delistCoupon",
      "discriminator": [
        60,
        158,
        196,
        182,
        238,
        104,
        228,
        203
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true
        },
        {
          "name": "coupon"
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeRewardsPool",
      "discriminator": [
        101,
        39,
        131,
        25,
        202,
        32,
        15,
        217
      ],
      "accounts": [
        {
          "name": "rewardsPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rewardRatePerDay",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeUserProfile",
      "discriminator": [
        192,
        144,
        204,
        140,
        113,
        25,
        59,
        102
      ],
      "accounts": [
        {
          "name": "userProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinGroupDeal",
      "discriminator": [
        37,
        179,
        229,
        69,
        250,
        197,
        155,
        17
      ],
      "accounts": [
        {
          "name": "groupDeal",
          "writable": true
        },
        {
          "name": "participant",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  114,
                  111,
                  117,
                  112,
                  95,
                  112,
                  97,
                  114,
                  116,
                  105,
                  99,
                  105,
                  112,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "groupDeal"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "listCoupon",
      "docs": [
        "List coupon for sale on secondary marketplace",
        "",
        "DESIGN NOTE: Uses listing_count to prevent PDA collisions.",
        "Scenario: User lists coupon → delists → lists again",
        "Without counter: Same PDA seeds = account already exists = error",
        "With counter: Each listing gets unique PDA (listing #0, #1, #2, etc.)",
        "The counter persists even after sale, allowing unlimited re-listings."
      ],
      "discriminator": [
        136,
        133,
        162,
        135,
        190,
        82,
        69,
        10
      ],
      "accounts": [
        {
          "name": "coupon",
          "writable": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              },
              {
                "kind": "account",
                "path": "coupon.listing_count",
                "account": "coupon"
              }
            ]
          }
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "stakedCoupon",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  100,
                  95,
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "priceLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "mintCoupon",
      "discriminator": [
        190,
        110,
        73,
        138,
        8,
        160,
        244,
        63
      ],
      "accounts": [
        {
          "name": "deal",
          "writable": true
        },
        {
          "name": "coupon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "deal.current_supply",
                "account": "deal"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "metadata",
          "writable": true
        },
        {
          "name": "userUsdcAccount",
          "writable": true
        },
        {
          "name": "merchantUsdcAccount",
          "writable": true
        },
        {
          "name": "merchant"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "pubkey"
        },
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "mintLoyaltyBadge",
      "discriminator": [
        168,
        96,
        227,
        110,
        93,
        28,
        31,
        64
      ],
      "accounts": [
        {
          "name": "loyaltyBadge",
          "writable": true
        },
        {
          "name": "userProfile",
          "writable": true
        },
        {
          "name": "badgeMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "badgeTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "badgeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "badgeType",
          "type": "u8"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "rateDeal",
      "discriminator": [
        193,
        82,
        126,
        41,
        197,
        81,
        244,
        3
      ],
      "accounts": [
        {
          "name": "deal",
          "writable": true
        },
        {
          "name": "dealRating",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rating",
          "type": "u8"
        }
      ]
    },
    {
      "name": "redeemCoupon",
      "discriminator": [
        66,
        181,
        163,
        197,
        244,
        189,
        153,
        0
      ],
      "accounts": [
        {
          "name": "coupon",
          "writable": true
        },
        {
          "name": "deal"
        },
        {
          "name": "merchant",
          "signer": true
        },
        {
          "name": "stakedCoupon",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  100,
                  95,
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "stakeCoupon",
      "discriminator": [
        71,
        4,
        167,
        79,
        221,
        84,
        213,
        156
      ],
      "accounts": [
        {
          "name": "coupon"
        },
        {
          "name": "stakedCoupon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  100,
                  95,
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        },
        {
          "name": "rewardsPool",
          "writable": true
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "transferCoupon",
      "docs": [
        "Transfer coupon ownership",
        "",
        "DESIGN NOTE: This updates the logical owner in the Coupon account.",
        "The actual NFT (SPL token) transfer happens separately via token::transfer",
        "in the frontend. This separation allows:",
        "- On-chain business logic (redemption, listing) to check Coupon.owner",
        "- NFTs to remain in user wallets (visible in explorers/wallets)",
        "- Marketplace to transfer both token AND coupon ownership atomically"
      ],
      "discriminator": [
        144,
        38,
        18,
        1,
        196,
        64,
        73,
        74
      ],
      "accounts": [
        {
          "name": "coupon",
          "writable": true
        },
        {
          "name": "currentOwner",
          "signer": true
        },
        {
          "name": "newOwner"
        },
        {
          "name": "stakedCoupon",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  100,
                  95,
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "unstakeCoupon",
      "discriminator": [
        131,
        36,
        231,
        138,
        180,
        249,
        26,
        197
      ],
      "accounts": [
        {
          "name": "stakedCoupon",
          "writable": true
        },
        {
          "name": "coupon"
        },
        {
          "name": "rewardsPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "rewardsPoolUsdcAccount",
          "writable": true
        },
        {
          "name": "stakerUsdcAccount",
          "writable": true
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "updateDeal",
      "discriminator": [
        244,
        195,
        62,
        95,
        133,
        119,
        244,
        59
      ],
      "accounts": [
        {
          "name": "deal",
          "writable": true
        },
        {
          "name": "merchant",
          "signer": true,
          "relations": [
            "deal"
          ]
        }
      ],
      "args": [
        {
          "name": "isActive",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "priceLamports",
          "type": {
            "option": "u64"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "comment",
      "discriminator": [
        150,
        135,
        96,
        244,
        55,
        199,
        50,
        65
      ]
    },
    {
      "name": "coupon",
      "discriminator": [
        24,
        230,
        224,
        210,
        200,
        206,
        79,
        57
      ]
    },
    {
      "name": "deal",
      "discriminator": [
        125,
        223,
        160,
        234,
        71,
        162,
        182,
        219
      ]
    },
    {
      "name": "dealRating",
      "discriminator": [
        123,
        212,
        42,
        230,
        61,
        42,
        190,
        167
      ]
    },
    {
      "name": "groupDeal",
      "discriminator": [
        251,
        18,
        233,
        197,
        54,
        139,
        183,
        133
      ]
    },
    {
      "name": "groupParticipant",
      "discriminator": [
        219,
        23,
        9,
        69,
        193,
        219,
        76,
        73
      ]
    },
    {
      "name": "listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    },
    {
      "name": "loyaltyBadge",
      "discriminator": [
        32,
        174,
        41,
        70,
        176,
        158,
        68,
        69
      ]
    },
    {
      "name": "rewardsPool",
      "discriminator": [
        107,
        36,
        119,
        42,
        181,
        249,
        18,
        37
      ]
    },
    {
      "name": "sale",
      "discriminator": [
        202,
        64,
        232,
        171,
        178,
        172,
        34,
        183
      ]
    },
    {
      "name": "stakedCoupon",
      "discriminator": [
        181,
        11,
        120,
        4,
        81,
        93,
        121,
        98
      ]
    },
    {
      "name": "userProfile",
      "discriminator": [
        32,
        37,
        119,
        205,
        179,
        180,
        13,
        194
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidDiscount",
      "msg": "Invalid discount percentage"
    },
    {
      "code": 6001,
      "name": "invalidSupply",
      "msg": "Invalid supply amount"
    },
    {
      "code": 6002,
      "name": "invalidExpiry",
      "msg": "Invalid expiry timestamp"
    },
    {
      "code": 6003,
      "name": "dealInactive",
      "msg": "Deal is not active"
    },
    {
      "code": 6004,
      "name": "maxSupplyReached",
      "msg": "Maximum supply reached"
    },
    {
      "code": 6005,
      "name": "dealExpired",
      "msg": "Deal has expired"
    },
    {
      "code": 6006,
      "name": "alreadyRedeemed",
      "msg": "Coupon already redeemed"
    },
    {
      "code": 6007,
      "name": "notOwner",
      "msg": "Not the owner of this coupon"
    },
    {
      "code": 6008,
      "name": "unauthorizedMerchant",
      "msg": "Unauthorized merchant"
    },
    {
      "code": 6009,
      "name": "invalidRating",
      "msg": "Invalid rating value (must be 1-5)"
    },
    {
      "code": 6010,
      "name": "commentTooLong",
      "msg": "Comment too long"
    },
    {
      "code": 6011,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6012,
      "name": "listingInactive",
      "msg": "Listing is not active"
    },
    {
      "code": 6013,
      "name": "invalidListing",
      "msg": "Invalid listing"
    },
    {
      "code": 6014,
      "name": "noRewardsToClaim",
      "msg": "No rewards to claim"
    },
    {
      "code": 6015,
      "name": "couponStaked",
      "msg": "Coupon is currently staked and cannot be redeemed, transferred, or listed"
    },
    {
      "code": 6016,
      "name": "invalidPaymentToken",
      "msg": "Invalid payment token - must use platform USDC"
    },
    {
      "code": 6017,
      "name": "invalidBadgeType",
      "msg": "Invalid badge type (must be 1-4)"
    },
    {
      "code": 6018,
      "name": "invalidGroupThreshold",
      "msg": "Invalid group threshold configuration"
    },
    {
      "code": 6019,
      "name": "groupThresholdNotMet",
      "msg": "Group deal threshold not yet met"
    }
  ],
  "types": [
    {
      "name": "comment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "author",
            "type": "pubkey"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "coupon",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "isRedeemed",
            "type": "bool"
          },
          {
            "name": "mintedAt",
            "type": "i64"
          },
          {
            "name": "redeemedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "listingCount",
            "type": "u32"
          },
          {
            "name": "saleCount",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "deal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "discountPercent",
            "type": "u8"
          },
          {
            "name": "maxSupply",
            "type": "u64"
          },
          {
            "name": "currentSupply",
            "type": "u64"
          },
          {
            "name": "expiryTimestamp",
            "type": "i64"
          },
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "totalRatings",
            "type": "u64"
          },
          {
            "name": "ratingSum",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "dealRating",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "rating",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "groupDeal",
      "docs": [
        "Group Deal - collaborative buying with tiered discounts"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "targetParticipants",
            "type": "u32"
          },
          {
            "name": "currentParticipants",
            "type": "u32"
          },
          {
            "name": "tier1Discount",
            "type": "u8"
          },
          {
            "name": "tier2Discount",
            "type": "u8"
          },
          {
            "name": "tier3Discount",
            "type": "u8"
          },
          {
            "name": "tier1Threshold",
            "type": "u32"
          },
          {
            "name": "tier2Threshold",
            "type": "u32"
          },
          {
            "name": "tier3Threshold",
            "type": "u32"
          },
          {
            "name": "expiryTimestamp",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "groupParticipant",
      "docs": [
        "Group Deal Participant"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "groupDeal",
            "type": "pubkey"
          },
          {
            "name": "participant",
            "type": "pubkey"
          },
          {
            "name": "joinedAt",
            "type": "i64"
          },
          {
            "name": "hasClaimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "listingNumber",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loyaltyBadge",
      "docs": [
        "Loyalty Badge - NFT achievement for user milestones"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "badgeType",
            "type": "u8"
          },
          {
            "name": "earnedAt",
            "type": "i64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rewardsPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalStaked",
            "type": "u64"
          },
          {
            "name": "rewardRatePerDay",
            "type": "u64"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sale",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listing",
            "type": "pubkey"
          },
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "soldAt",
            "type": "i64"
          },
          {
            "name": "saleNumber",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stakedCoupon",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "stakedAt",
            "type": "i64"
          },
          {
            "name": "lastClaimAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userProfile",
      "docs": [
        "User Profile - tracks user activity and achievements"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "dealsClaimed",
            "type": "u64"
          },
          {
            "name": "totalSpentLamports",
            "type": "u64"
          },
          {
            "name": "badgesEarned",
            "type": "u32"
          },
          {
            "name": "firstDealTimestamp",
            "type": "i64"
          },
          {
            "name": "lastActivityTimestamp",
            "type": "i64"
          },
          {
            "name": "totalSavingsLamports",
            "type": "u64"
          },
          {
            "name": "referralsMade",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "mockUsdcMint",
      "docs": [
        "Mock USDC mint address for devnet/localnet testing",
        "6 decimals (matches real USDC on mainnet)",
        "",
        "For PRODUCTION/MAINNET: Replace with real USDC mint address:",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      ],
      "type": "pubkey",
      "value": "HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp"
    }
  ]
};
