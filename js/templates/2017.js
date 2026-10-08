export const BASE_2017 = {
  "schema_version": "1.1.0",
  "metadata": {
    "id": "shizuoka_2017_math_07",
    "prefecture": "静岡県",
    "exam_type": "公立高校入試",
    "subject": "数学",
    "year": 2017,
    "problem_number": "7",
    "points": 9,
    "source": {
      "type": "past_exam",
      "provider": "静岡県教育委員会提供情報をもとに掲載された過去問",
      "problem_url": "https://resemom.jp/feature/public-highschool-exam/shizuoka/2017/math/question06.html",
      "archive_url": "https://resemom.jp/feature/public-highschool-exam/shizuoka/2017/",
      "secondary_visual_source": "https://note.com/juken_2003/n/nb6e34aa5f8d0"
    },
    "notes": [
      "2017年度静岡県公立高校入試・数学大問7。",
      "（1）は△AEG∽△CDEの証明。",
      "（2）はAD=4cm、AE=2cm、EC=3cmのとき、△CDEの面積が△DGEの面積の何倍かを求める。",
      "2017年の大問7は相似・円周角を中心とした構成である。"
    ]
  },
  "problem": {
    "type": "geometry_similarity_proof",
    "statement": {
      "raw": "図において、3点A、B、Cは円Oの円周上の点である。∠ABCの二等分線と円Oとのもう一つの交点をDとし、BDとACとの交点をEとする。BC上にBF=EFとなる点Fをとり、FEの延長とADとの交点をGとする。このとき、次の（1）、（2）の問いに答えなさい。",
      "conditions": [
        "A,B,C,Dは円Oの円周上",
        "BDは∠ABCの二等分線",
        "E=BD∩AC",
        "FはBC上でBF=EF",
        "G=FEの延長∩AD"
      ]
    },
    "parts": [
      {
        "id": "P1",
        "number": 1,
        "type": "proof",
        "points": 6,
        "question": "△AEG∽△CDEであることを証明しなさい。",
        "target": {
          "relation": "similar_triangles",
          "triangles": [
            "AEG",
            "CDE"
          ],
          "correspondence": {
            "A": "C",
            "E": "D",
            "G": "E"
          }
        }
      },
      {
        "id": "P2",
        "number": 2,
        "type": "area_ratio",
        "points": 3,
        "question": "AD=4cm、AE=2cm、EC=3cmのとき、△CDEの面積は△DGEの面積の何倍か答えなさい。",
        "target": {
          "quantity": "area_ratio",
          "numerator": "triangle_CDE",
          "denominator": "triangle_DGE",
          "answer": "12/5"
        }
      }
    ]
  },
  "geometry": {
    "coordinate_system": {
      "type": "exact_euclidean_model",
      "primary_model": "circumcircle_of_3_4_5_triangle",
      "purpose": "図形検証・自動作図用の正規化ではなく、（2）の指定長をそのまま満たすcanonical model",
      "axis": "x right, y up",
      "construction_reference": "AD=DC=4, AC=5, AE=2, EC=3"
    },
    "objects": {
      "points": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "O"
      ],
      "segments": [
        "AB",
        "BC",
        "CA",
        "AD",
        "DC",
        "BD",
        "AE",
        "EC",
        "BE",
        "BF",
        "EF",
        "EG",
        "AG",
        "DG",
        "DE"
      ],
      "lines": [
        "AC",
        "BC",
        "BD",
        "AD",
        "EF",
        "EG",
        "DE"
      ],
      "circles": [
        "O1"
      ],
      "triangles": [
        "ABC",
        "ABD",
        "BCD",
        "ADC",
        "BEF",
        "AEG",
        "CDE",
        "DGE"
      ]
    },
    "incidence": [
      {
        "point": "A",
        "on": "O1"
      },
      {
        "point": "B",
        "on": "O1"
      },
      {
        "point": "C",
        "on": "O1"
      },
      {
        "point": "D",
        "on": "O1"
      },
      {
        "point": "E",
        "on": "AC"
      },
      {
        "point": "E",
        "on": "BD"
      },
      {
        "point": "F",
        "on": "BC"
      },
      {
        "point": "G",
        "on": "AD"
      },
      {
        "point": "G",
        "on": "EF"
      }
    ],
    "intersections": [
      {
        "point": "E",
        "lines": [
          "AC",
          "BD"
        ]
      },
      {
        "point": "F",
        "line": "BC",
        "condition": "BF=EF"
      },
      {
        "point": "G",
        "lines": [
          "AD",
          "EF"
        ]
      }
    ],
    "relationships": [
      {
        "type": "angle_bisector",
        "vertex": "B",
        "line": "BD",
        "angle": "ABC"
      },
      {
        "type": "equal_length",
        "segments": [
          "BF",
          "EF"
        ]
      },
      {
        "type": "equal_length",
        "segments": [
          "AD",
          "DC"
        ]
      },
      {
        "type": "equal_arc",
        "arcs": [
          "AD",
          "DC"
        ],
        "derived": true
      },
      {
        "type": "collinear",
        "points": [
          "A",
          "E",
          "C"
        ]
      },
      {
        "type": "collinear",
        "points": [
          "B",
          "E",
          "D"
        ]
      },
      {
        "type": "collinear",
        "points": [
          "B",
          "F",
          "C"
        ]
      },
      {
        "type": "collinear",
        "points": [
          "A",
          "G",
          "D"
        ]
      },
      {
        "type": "collinear",
        "points": [
          "E",
          "F",
          "G"
        ]
      },
      {
        "type": "similar",
        "triangles": [
          "AEG",
          "CDE"
        ],
        "correspondence": [
          "A-C",
          "E-D",
          "G-E"
        ]
      }
    ],
    "construction_sequence": [
      {
        "step": 1,
        "operation": "create_circle",
        "id": "O1",
        "center": "O",
        "radius": "16√39/39"
      },
      {
        "step": 2,
        "operation": "place_points",
        "points": [
          "A",
          "B",
          "C"
        ]
      },
      {
        "step": 3,
        "operation": "construct_angle_bisector",
        "vertex": "B",
        "angle": "ABC",
        "line": "BD"
      },
      {
        "step": 4,
        "operation": "intersect_line_circle",
        "line": "BD",
        "circle": "O1",
        "result": "D"
      },
      {
        "step": 5,
        "operation": "intersect_lines",
        "lines": [
          "BD",
          "AC"
        ],
        "result": "E"
      },
      {
        "step": 6,
        "operation": "construct_equal_distance_point",
        "point": "F",
        "line": "BC",
        "condition": "BF=EF"
      },
      {
        "step": 7,
        "operation": "intersect_lines",
        "lines": [
          "EF",
          "AD"
        ],
        "result": "G"
      }
    ],
    "display": {
      "visible_points": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "O"
      ],
      "visible_segments": [
        "AB",
        "BC",
        "CA",
        "AD",
        "DC",
        "BD",
        "EF",
        "AD",
        "DE"
      ],
      "visible_circle": "O1",
      "special_marks": [
        {
          "type": "angle_bisector",
          "line": "BD",
          "angle": "ABC"
        },
        {
          "type": "equal_length",
          "segments": [
            "BF",
            "EF"
          ]
        }
      ]
    },
    "coordinates": {
      "points": {
        "A": {
          "x": 0.0,
          "y": 0.0,
          "role": "circle_point",
          "exact": [
            "0",
            "0"
          ]
        },
        "C": {
          "x": 5.0,
          "y": 0.0,
          "role": "circle_point",
          "exact": [
            "5",
            "0"
          ]
        },
        "D": {
          "x": 2.5,
          "y": 3.122498999199199,
          "role": "circle_point",
          "exact": [
            "5/2",
            "√39/2"
          ]
        },
        "B": {
          "x": 1.7,
          "y": -1.8734993995195197,
          "role": "circle_point",
          "exact": [
            "17/10",
            "-3√39/10"
          ]
        },
        "E": {
          "x": 2.0,
          "y": 0.0,
          "role": "intersection",
          "exact": [
            "2",
            "0"
          ]
        },
        "F": {
          "x": 3.02,
          "y": -1.1240996397117116,
          "role": "construction_point",
          "exact": [
            "151/50",
            "-9√39/50"
          ]
        },
        "G": {
          "x": 0.9375,
          "y": 1.1709371246996998,
          "role": "intersection",
          "exact": [
            "15/16",
            "3√39/16"
          ]
        },
        "O": {
          "x": 2.5,
          "y": 0.560448538317805,
          "role": "circle_center",
          "exact": [
            "5/2",
            "7√39/78"
          ]
        }
      },
      "circle": {
        "id": "O1",
        "center": "O",
        "radius": 2.562050460881394,
        "exact_radius": "16√39/39"
      },
      "verification_reference": {
        "AD": 4,
        "DC": 4,
        "AC": 5,
        "AE": 2,
        "EC": 3,
        "AG": 1.5,
        "DG": 2.5,
        "BF_equals_EF": 1.5178932768808222
      }
    }
  },
  "variables": {
    "s": {
      "symbol": "s",
      "meaning": "△AEGと△CDEの相似比（AE:CD）",
      "value": "1/2"
    },
    "AG": {
      "symbol": "AG",
      "meaning": "線分AGの長さ",
      "value": "3/2",
      "unit": "cm"
    },
    "DG": {
      "symbol": "DG",
      "meaning": "線分DGの長さ",
      "value": "5/2",
      "unit": "cm"
    },
    "area_ratio": {
      "symbol": "R",
      "meaning": "△CDEの面積 / △DGEの面積",
      "value": "12/5"
    }
  },
  "given_conditions": [
    {
      "id": "C01",
      "type": "concyclic",
      "objects": [
        "A",
        "B",
        "C",
        "D"
      ],
      "statement": "A,B,C,Dは円Oの円周上"
    },
    {
      "id": "C02",
      "type": "angle_bisector",
      "objects": [
        "B",
        "BD",
        "ABC"
      ],
      "statement": "BDは∠ABCの二等分線"
    },
    {
      "id": "C03",
      "type": "intersection",
      "objects": [
        "E",
        "BD",
        "AC"
      ],
      "statement": "E=BD∩AC"
    },
    {
      "id": "C04",
      "type": "collinear",
      "objects": [
        "B",
        "F",
        "C"
      ],
      "statement": "FはBC上"
    },
    {
      "id": "C05",
      "type": "equal_length",
      "objects": [
        "BF",
        "EF"
      ],
      "statement": "BF=EF"
    },
    {
      "id": "C06",
      "type": "intersection",
      "objects": [
        "G",
        "EF",
        "AD"
      ],
      "statement": "G=EFの延長∩AD"
    },
    {
      "id": "C07",
      "type": "length",
      "objects": [
        "AD"
      ],
      "value": 4,
      "unit": "cm",
      "used_in": [
        "P2"
      ]
    },
    {
      "id": "C08",
      "type": "length",
      "objects": [
        "AE"
      ],
      "value": 2,
      "unit": "cm",
      "used_in": [
        "P2"
      ]
    },
    {
      "id": "C09",
      "type": "length",
      "objects": [
        "EC"
      ],
      "value": 3,
      "unit": "cm",
      "used_in": [
        "P2"
      ]
    }
  ],
  "derived_facts": [
    {
      "id": "F01",
      "statement": "∠ABD=∠DBC",
      "reason": "BDは∠ABCの二等分線",
      "theorem": "angle_bisector_definition"
    },
    {
      "id": "F02",
      "statement": "弧AD=弧DC",
      "reason": "等しい円周角∠ABD=∠DBCが対する弧は等しい",
      "theorem": "equal_inscribed_angles_equal_arcs"
    },
    {
      "id": "F03",
      "statement": "AD=DC",
      "reason": "等しい弧に対する弦は等しい",
      "theorem": "equal_arcs_equal_chords"
    },
    {
      "id": "F04",
      "statement": "△ADCはAD=DCの二等辺三角形",
      "reason": "F03",
      "theorem": "isosceles_triangle"
    },
    {
      "id": "F05",
      "statement": "∠CAD=∠DCA",
      "reason": "△ADCは二等辺三角形",
      "theorem": "isosceles_base_angles"
    },
    {
      "id": "F06",
      "statement": "∠EAG=∠DCE",
      "reason": "A,E,Cが一直線、A,G,Dが一直線、F05",
      "theorem": "collinear_angle"
    },
    {
      "id": "F07",
      "statement": "△BEFはBF=EFの二等辺三角形",
      "reason": "仮定BF=EF",
      "theorem": "isosceles_triangle"
    },
    {
      "id": "F08",
      "statement": "∠BEF=∠EBF",
      "reason": "△BEFの二等辺三角形",
      "theorem": "isosceles_base_angles"
    },
    {
      "id": "F09",
      "statement": "∠EBF=∠DBC",
      "reason": "B,F,Cが一直線",
      "theorem": "collinear_angle"
    },
    {
      "id": "F10",
      "statement": "∠BEF=∠DBC",
      "reason": "F08,F09",
      "theorem": "angle_transitivity"
    },
    {
      "id": "F11",
      "statement": "∠CEF=∠CAB",
      "reason": "△CBEの内角の和、F10、E∈AC・E∈BD",
      "theorem": "triangle_angle_sum"
    },
    {
      "id": "F12",
      "statement": "∠CDB=∠CAB",
      "reason": "同じ弧CBに対する円周角",
      "theorem": "inscribed_angle_same_arc"
    },
    {
      "id": "F13",
      "statement": "∠AEG=∠CEF",
      "reason": "A,E,Cが一直線、E,F,Gが一直線で対頂角",
      "theorem": "vertical_angles"
    },
    {
      "id": "F14",
      "statement": "∠AEG=∠CDE",
      "reason": "F11,F12,F13およびB,E,Dが一直線",
      "theorem": "angle_transitivity"
    },
    {
      "id": "F15",
      "statement": "△AEG∽△CDE",
      "reason": "∠EAG=∠DCE、∠AEG=∠CDE",
      "theorem": "AA_similarity"
    },
    {
      "id": "F16",
      "statement": "AE:CD=1:2",
      "reason": "AE=2, CD=AD=4",
      "theorem": "length_substitution"
    },
    {
      "id": "F17",
      "statement": "AG:CE=1:2",
      "reason": "△AEG∽△CDEの対応辺",
      "theorem": "similarity_corresponding_sides"
    },
    {
      "id": "F18",
      "statement": "AG=3/2",
      "reason": "CE=3、AG:CE=1:2",
      "theorem": "ratio_calculation"
    },
    {
      "id": "F19",
      "statement": "DG=5/2",
      "reason": "AD=4、AG=3/2、GはAD上",
      "theorem": "segment_subtraction"
    },
    {
      "id": "F20",
      "statement": "[CDE]/[ADE]=CE/AE=3/2",
      "reason": "△CDEと△ADEは底辺をそれぞれCE,AEとし、高さが等しい",
      "theorem": "same_altitude_area_ratio"
    },
    {
      "id": "F21",
      "statement": "[ADE]/[DGE]=AD/DG=4/(5/2)=8/5",
      "reason": "△ADEと△DGEは共通の角∠ADEを利用し、底辺をAD,DGとみなせる",
      "theorem": "same_included_angle_area_ratio"
    },
    {
      "id": "F22",
      "statement": "[CDE]/[DGE]=12/5",
      "reason": "F20,F21",
      "theorem": "area_ratio_multiplication"
    }
  ],
  "theorem_library": [
    {
      "id": "T01",
      "name": "角の二等分線の定義",
      "key": "angle_bisector_definition"
    },
    {
      "id": "T02",
      "name": "等しい円周角と等しい弧",
      "key": "equal_inscribed_angles_equal_arcs"
    },
    {
      "id": "T03",
      "name": "等しい弧に対する等しい弦",
      "key": "equal_arcs_equal_chords"
    },
    {
      "id": "T04",
      "name": "二等辺三角形の底角",
      "key": "isosceles_base_angles"
    },
    {
      "id": "T05",
      "name": "同じ弧に対する円周角",
      "key": "inscribed_angle_same_arc"
    },
    {
      "id": "T06",
      "name": "対頂角",
      "key": "vertical_angles"
    },
    {
      "id": "T07",
      "name": "三角形の内角の和",
      "key": "triangle_angle_sum"
    },
    {
      "id": "T08",
      "name": "二角相等による相似",
      "key": "AA_similarity"
    },
    {
      "id": "T09",
      "name": "相似な図形の対応辺の比",
      "key": "similarity_corresponding_sides"
    },
    {
      "id": "T10",
      "name": "同じ高さの三角形の面積比",
      "key": "same_altitude_area_ratio"
    },
    {
      "id": "T11",
      "name": "共通角をもつ三角形の面積比",
      "key": "same_included_angle_area_ratio"
    }
  ],
  "proof": {
    "P1": {
      "target": "△AEG∽△CDE",
      "method": "AA",
      "correspondence": {
        "A": "C",
        "E": "D",
        "G": "E"
      },
      "proof_graph": {
        "nodes": [
          "BD bisects ∠ABC",
          "∠ABD=∠DBC",
          "arc AD=arc DC",
          "AD=DC",
          "△ADC is isosceles",
          "∠CAD=∠DCA",
          "∠EAG=∠DCE",
          "BF=EF",
          "△BEF is isosceles",
          "∠BEF=∠EBF=∠DBC",
          "∠CEF=∠CAB",
          "∠CDB=∠CAB",
          "∠AEG=∠CEF",
          "∠AEG=∠CDE",
          "△AEG∽△CDE"
        ],
        "edges": [
          [
            "BD bisects ∠ABC",
            "∠ABD=∠DBC"
          ],
          [
            "∠ABD=∠DBC",
            "arc AD=arc DC"
          ],
          [
            "arc AD=arc DC",
            "AD=DC"
          ],
          [
            "AD=DC",
            "△ADC is isosceles"
          ],
          [
            "△ADC is isosceles",
            "∠CAD=∠DCA"
          ],
          [
            "∠CAD=∠DCA",
            "collinear A-E-C and A-G-D",
            "∠EAG=∠DCE"
          ],
          [
            "BF=EF",
            "△BEF is isosceles"
          ],
          [
            "△BEF is isosceles",
            "∠BEF=∠EBF"
          ],
          [
            "B-F-C collinear",
            "∠EBF=∠DBC"
          ],
          [
            "∠BEF=∠DBC",
            "triangle CBE angle sum",
            "∠CEF=∠CAB"
          ],
          [
            "∠CDB=∠CAB",
            "B-E-D collinear",
            "∠CDE=∠CAB"
          ],
          [
            "E-F-G collinear and A-E-C collinear",
            "∠AEG=∠CEF"
          ],
          [
            "∠CEF=∠CAB",
            "∠CDE=∠CAB",
            "∠AEG=∠CDE"
          ],
          [
            "∠EAG=∠DCE",
            "∠AEG=∠CDE",
            "△AEG∽△CDE"
          ]
        ]
      },
      "solution_steps": [
        {
          "id": "S01",
          "statement": "BDは∠ABCの二等分線なので、∠ABD=∠DBC。"
        },
        {
          "id": "S02",
          "statement": "∠ABDと∠DBCはそれぞれ弧AD、弧DCに対する円周角なので、弧AD=弧DC。したがってAD=DC。"
        },
        {
          "id": "S03",
          "statement": "よって△ADCは二等辺三角形だから、∠CAD=∠DCA。A,E,CおよびA,G,Dはそれぞれ一直線上なので、∠EAG=∠DCE。"
        },
        {
          "id": "S04",
          "statement": "BF=EFなので△BEFは二等辺三角形。したがって∠BEF=∠EBF。B,F,Cは一直線上なので、∠EBF=∠DBC。"
        },
        {
          "id": "S05",
          "statement": "△CBEにおいて、∠CEF=∠CABとなる。"
        },
        {
          "id": "S06",
          "statement": "また、∠CDBと∠CABは同じ弧CBに対する円周角なので、∠CDB=∠CAB。B,E,Dが一直線上にあるから、∠CDE=∠CAB。"
        },
        {
          "id": "S07",
          "statement": "A,E,CとE,F,Gがそれぞれ一直線上なので、∠AEG=∠CEF。したがって∠AEG=∠CDE。"
        },
        {
          "id": "S08",
          "statement": "∠EAG=∠DCE、∠AEG=∠CDEより、二角がそれぞれ等しいので△AEG∽△CDE。"
        }
      ]
    },
    "P2": {
      "target": "[CDE]/[DGE]",
      "solution_chain": [
        "P1より△AEG∽△CDE",
        "AE:CD=2:4=1:2",
        "対応辺AG:CE=1:2",
        "CE=3よりAG=3/2",
        "AD=4よりDG=4−3/2=5/2",
        "[CDE]/[ADE]=CE/AE=3/2",
        "[ADE]/[DGE]=AD/DG=4/(5/2)=8/5",
        "[CDE]/[DGE]=(3/2)(8/5)=12/5"
      ],
      "answer": "12/5"
    }
  },
  "follow_up": {
    "P2": {
      "type": "area_ratio",
      "derived": {
        "CD": 4,
        "AG": "3/2",
        "DG": "5/2",
        "CDE_to_ADE": "3/2",
        "ADE_to_DGE": "8/5"
      },
      "formula": "[CDE]/[DGE]=(3/2)×(8/5)",
      "answer": "12/5"
    }
  },
  "question_generation": {
    "can_generate_problem": true,
    "can_generate_answer": true,
    "template_id": "SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001",
    "problem_type": "circle_angle_bisector_isosceles_similarity_area_ratio",
    "generation_parameters": {
      "triangle_ADC": {
        "type": "isosceles",
        "equal_sides": [
          "AD",
          "DC"
        ],
        "randomizable": true
      },
      "AE_to_EC": {
        "type": "positive_length_ratio",
        "default": [
          2,
          3
        ],
        "randomizable": true
      },
      "AD": {
        "type": "positive_length",
        "default": 4,
        "randomizable": true
      },
      "point_labels": {
        "randomizable": true
      },
      "orientation": {
        "randomizable": true
      }
    },
    "constraints": [
      "A,B,C,D must be concyclic",
      "BD must bisect ∠ABC",
      "E=BD∩AC",
      "F must lie on BC",
      "BF=EF",
      "G=EF extended ∩ AD",
      "P1 must produce AA similarity AEG~CDE",
      "P2 must produce a positive rational area ratio"
    ]
  },
  "answer_generation": {
    "P1": {
      "format": "proof",
      "required_theorems": [
        "angle_bisector_definition",
        "equal_inscribed_angles_equal_arcs",
        "equal_arcs_equal_chords",
        "isosceles_base_angles",
        "inscribed_angle_same_arc",
        "triangle_angle_sum",
        "vertical_angles",
        "AA_similarity"
      ],
      "sentence_templates": [
        "BDは∠ABCの二等分線なので、∠ABD=∠DBC。",
        "∠ABDと∠DBCは円周角なので、弧AD=弧DC。したがってAD=DC。",
        "よって△ADCは二等辺三角形だから、∠CAD=∠DCA。",
        "BF=EFなので△BEFは二等辺三角形。したがって∠BEF=∠EBF。",
        "B,F,Cは一直線上なので、∠EBF=∠DBC。",
        "△CBEの内角の和と上の等式から∠CEF=∠CAB。",
        "∠CDBと∠CABは同じ弧CBに対する円周角なので、∠CDB=∠CAB。",
        "対頂角より∠AEG=∠CEF。",
        "以上より∠EAG=∠DCE、∠AEG=∠CDEなので、△AEG∽△CDE。"
      ]
    },
    "P2": {
      "format": "area_ratio",
      "equations": [
        "AE:CD=2:4=1:2",
        "AG:CE=1:2",
        "AG=3/2",
        "DG=4−3/2=5/2",
        "[CDE]/[ADE]=3/2",
        "[ADE]/[DGE]=4/(5/2)=8/5",
        "[CDE]/[DGE]=12/5"
      ],
      "answer": "12/5"
    }
  },
  "validation": {
    "geometry": {
      "required": [
        "A,B,C,D lie on O1",
        "BD bisects ∠ABC",
        "E=BD∩AC",
        "F∈BC",
        "BF=EF",
        "G∈AD∩EF",
        "AD=DC"
      ],
      "coordinate_model_valid": true,
      "checks": {
        "A_C_D_concyclic": {
          "expected": true,
          "actual": true
        },
        "B_concyclic": {
          "expected": true,
          "actual": true
        },
        "BD_angle_bisects_ABC": {
          "expected": true,
          "actual": true
        },
        "E_on_AC": {
          "expected": true,
          "actual": true
        },
        "E_on_BD": {
          "expected": true,
          "actual": true
        },
        "F_on_BC": {
          "expected": true,
          "actual": true
        },
        "BF_equals_EF": {
          "expected": true,
          "actual": true
        },
        "A_E_C_collinear": {
          "expected": true,
          "actual": true
        },
        "A_G_D_collinear": {
          "expected": true,
          "actual": true
        },
        "E_F_G_collinear": {
          "expected": true,
          "actual": true
        },
        "AD_equals_DC": {
          "expected": true,
          "actual": true
        },
        "AE_equals_2": {
          "expected": true,
          "actual": true
        },
        "EC_equals_3": {
          "expected": true,
          "actual": true
        },
        "AD_equals_4": {
          "expected": true,
          "actual": true
        },
        "AG_equals_1_5": {
          "expected": true,
          "actual": true
        },
        "DG_equals_2_5": {
          "expected": true,
          "actual": true
        },
        "angle_AEG_equals_CDE": {
          "expected": true,
          "actual": true
        },
        "angle_EAG_equals_DCE": {
          "expected": true,
          "actual": true
        }
      }
    },
    "proof": {
      "P1": {
        "target_is_reachable": true,
        "method": "AA_similarity",
        "correspondence": [
          "A-C",
          "E-D",
          "G-E"
        ],
        "circular_reasoning": false
      },
      "P2": {
        "answer_verified": true,
        "answer": "12/5"
      }
    },
    "answer": {
      "P1": {
        "target": "△AEG∽△CDE",
        "verified": true
      },
      "P2": {
        "calculation": "(3/2)×(8/5)=12/5",
        "verified": true
      }
    }
  },
  "difficulty": {
    "overall": "medium",
    "proof": "medium",
    "calculation": "medium",
    "proof_skills": [
      "角の二等分線",
      "円周角",
      "弧と弦",
      "二等辺三角形",
      "対頂角",
      "二角相等による相似",
      "相似比",
      "三角形の面積比"
    ]
  },
  "generation": {
    "source_template": "SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001",
    "generation_mode": "rule_based",
    "uses_llm": false,
    "coordinate_generation": {
      "method": "constraint_based",
      "reference_triangle": "3-4-5",
      "randomizable": true
    },
    "proof_generation": {
      "method": "proof_graph_traversal",
      "randomizable": true
    }
  },
  "source_analysis": {
    "structural_pattern": {
      "circle": "four_concyclic_points",
      "angle_bisector": "BD bisects ∠ABC",
      "derived_equal_chords": "AD=DC",
      "isosceles_auxiliary_triangle": "BEF",
      "construction": [
        "E=BD∩AC",
        "F∈BC and BF=EF",
        "G=EF extended ∩ AD"
      ],
      "proof_target": "△AEG∽△CDE",
      "proof_core": "AD=DCから△ADCの二等辺性を作り、BF=EFから△BEFの二等辺性を作り、円周角と対頂角をつないでAA相似へ到達",
      "follow_up": "area ratio",
      "follow_up_core": "相似比からAGを求め、面積比を[CDE]:[ADE]と[ADE]:[DGE]に分解"
    },
    "important_generation_observation": "2017年型では、角の二等分線そのものを直接証明に使い続けるのではなく、弧AD=弧DC→AD=DC→△ADCの二等辺性という構造へ変換する。またBF=EFも△BEFの二等辺性へ変換し、円周角・三角形の内角の和・対頂角を経由して2つの角の一致を生成する。"
  }
};
