import { Schema } from '../../index';
import {
  TypeboxSchemaValidator,
  array,
  bigint,
  boolean,
  date,
  empty,
  never,
  number,
  optional,
  string,
  symbol,
  union
} from '../../typebox/schemaValidator';

describe('Typebox Large Schema Tests', () => {
  it('Deep Union', () => {
    const deepOne = {
      s: {
        s: {
          s: {
            s: {
              s: {
                s: {
                  s: {
                    s: {
                      s: {
                        s: {
                          s: {
                            s: {
                              s: {
                                s: {
                                  b: 'number' as const
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const deepTwo = {
      k: {
        o: number,
        s: {
          s: {
            s: {
              s: {
                s: {
                  s: {
                    s: {
                      s: {
                        s: {
                          s: {
                            s: {
                              s: {
                                s: {
                                  b: string
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const deepUnion = union([deepOne, deepTwo]);
    type DeepUnionSchema = Schema<typeof deepUnion, TypeboxSchemaValidator>;
  });

  it('Realistic Schema', () => {
    const realistic = array({
      level1: {
        name: {
          j: union([
            string,
            number,
            date,
            boolean,
            bigint,
            empty,
            symbol,
            never
          ]),
          t: optional(
            union([
              array({
                y: array(number)
              }),
              string
            ])
          ),
          m: {
            a: optional(string),
            b: number,
            c: {
              d: string,
              e: number,
              f: {
                g: string,
                h: number,
                i: {
                  j: string,
                  k: number,
                  l: {
                    m: boolean,
                    n: array(string),
                    o: optional(union([string, number])),
                    p: {
                      q: string,
                      r: number
                    }
                  }
                }
              }
            }
          }
        },
        additionalField1: {
          a: union([string, boolean, bigint, empty]),
          b: optional(array(number)),
          c: {
            d: string,
            e: number,
            f: {
              g: string,
              h: number
            }
          }
        },
        additionalField2: {
          x: string,
          y: union([string, array(boolean)]),
          z: {
            a: string,
            b: number
          }
        }
      },
      code: {
        200: {
          j: string
        },
        404: {
          k: string
        }
      },
      flag: {
        a: true as const,
        b: false as const
      }
    });

    type RealisticSchema = Schema<typeof realistic, TypeboxSchemaValidator>;
  });
});
