/* Method tab content per scene, from 01_STORYBOARD.md (29 Oct 2026).
 * [[ ... ]] marks collaborator-only fragments: parameter ids, ADR numbers,
 * audit ids, file paths and engine-run references. They show in the committee
 * edition and are hidden in public mode (and stripped by tools/make_public.py).
 * eq: equation numbers from 04_EQUATIONS.md. ledger: extra ledger ids listed in
 * the tab besides the numbers shown on the scene.
 */
window.RAMOS_METHOD = {
  s01: {
    text: ['RAMOS covers mainland Portugal: agricultural, forest and municipal residues, plus manure (work in progress). Every residue is held at parcel or point level in its native geometry[[ (engine charter s2, ADR-0001)]].'],
    data: 'CAOP 2025 (outline)[[ D59]]. ICNF burning requests[[ D78/D79]], aggregated to municipality and month for the glow.',
    ledger: ['L005']
  },
  s02a: {
    text: ['National municipal biowaste balance for 2024, built from APA shares in the municipal stream work: committed (home and community composting, separate collection to composting and digestion, biological stage of mechanical-biological treatment up to each system\'s capacity) and uncommitted (organics in mixed waste going to landfill, incineration or mechanical treatment only).',
      'Organics from mixed municipal waste cannot become an EU fertilising product (Regulation 2021/2088, CMC 14), so in the engine they can go to digestion or energy, never to a soil product.[[ Decisions D1 to D8 in claude/municipal_biowaste_partA_record_20261002.md.]]',
      'Prunings burned in the field: olive fate table, scene S08.'],
    data: 'APA RARU 2024, INE municipal waste 2024, SGRU plant inventory[[ (Claude outputs/municipal_biowaste/)]].',
    gaps: 'The 2024 balance is from the 2 Oct version of the municipal stream (v0.2). Later SGRU replies (Braval, 7 Oct) moved a few systems slightly. Rows L103 to L106 were added on the site side and need Aido\'s check before they go into the main ledger.',
    ledger: ['L103', 'L104', 'L105', 'L106', 'L069', 'L015']
  },
  s02b: {
    text: ['The system boundary of RAMOS runs from the field, forest or bin to the end use: collection, transport, conversion, product use and the carbon left in the ground. Each pathway returns physical flows only (mass, carbon, energy, nutrients), and a life cycle inventory is attached per flow, so cost and carbon are computed the same way for every pathway.',
      'Framing: industrial ecology and urban metabolism, treating the economy as an ecosystem where outputs of one process feed another (cascades such as digestate to pyrolysis are modelled as a directed graph[[, ADR-0011]]). Carbon removal and avoided emissions are kept in separate columns.',
      'The biochar figures are from the submitted paper (under review): net mitigation for centralised plants across the three siting scenarios, and its share of the 2050 target used in that paper.'],
    data: 'Portugal national inventory 2024 (APA), submitted biochar paper, biomethane paper package.',
    ledger: ['L079', 'L080', 'L110', 'L111']
  },
  s02: {
    text: ['The overlap here is physical, not an accounting choice. The biochar paper used municipal organics as a centralised feedstock. The biomethane paper modelled anaerobic digestion of municipal biowaste in all 278 municipalities. A planner reading both would count those tonnes twice.',
      '[[Not the same as the sectoral attribution of avoided emissions, which the biochar paper rejected for MSW and set to zero. The claim here is only that one physical tonne cannot feed two pathways.]]',
      'Unconstrained claim per bidder versus the mass-balanced allocation (Eq 37). The ratio does not depend on price.[[ Across 12 carbon price runs it stayed at 2.800 (L076). Confirmed in the engine claims ledger and by the independent audit. Engine run 6da1854, refresh at Milestone 6.]]'],
    eq: ['37'],
    ledger: ['L109', 'L093', 'L075', 'L076']
  },
  s03: {
    text: ['The chain per zone: land, arising, pathway, metric, bid, allocation[[ (engine METHODOLOGY s1)]]. One solve with explicit objective, scope and constraints[[ (ADR-0018)]]. Pathways return physical flows only, never money[[ (charter s2)]]. Physics, then accounting, then the decision.']
  },
  s04: {
    text: ['Native geometry: parcels and points as vectors, rasters at their own resolution, answers given per parcel or point. Grids are for summaries only[[ (charter s2, ADR-0001)]]. One coordinate system per run (EPSG:3763) and CAOP boundaries.',
      'Data enters as data packs with a register row: provider, licence, version, CRS, checksum and class[[ (charter s5)]]. A new region is new data, not new code.',
      'Parcel geometry is personal data[[ (ADR-0028)]]. It is shown only as a texture or aggregated, never zoomable to a single declared parcel, until the release rule is signed off.'],
    data: 'iSIP parcels, IFAP[[ D20/D21]]. COSc land cover 2022 to 2025, DGT[[ D01 to D04]]. Copernicus high resolution layers[[ D47 to D55]]. CAOP[[ D59]]. Municipal waste points, APA[[ L17/L18]]. OpenStreetMap[[ D13]].',
    ledger: ['L001', 'L002']
  },
  s05: {
    text: ['Feedstock identity stays on the batch from parcel to plant to product[[ (ADR-0030)]]. Each stream has its own arising method: olive and vine per declared tree or vine, fruit and nuts per tree, straw from grain area and IPCC slope factors, forest residues from harvest statistics spread to parcels by NUTS III, municipal biowaste from APA and INE data per municipality, manure from IPCC factors (work in progress).[[ Stream methods are documented in 00_COORDINATION/sections/.]]',
      'The map classes are quartiles of the municipalities with any arising of that residue (0 means none). They predate the engine and show presence, not results.'],
    data: 'iSIP[[ D20/D21]], INE agricultural statistics[[ D10]], IFN6 forest inventory[[ D72/D73]], EFDA[[ D05]], harvest locator[[ D69]], municipal organic waste[[ L18]], manure layer[[ (Claude outputs/manure_spatial)]].',
    gaps: 'Manure at farm level has no data yet, so it carries a work in progress label. Forest residue coefficients for eucalyptus, pine and matos are not settled in the engine, so the forest beat is provisional. Straw, maize and montado are mapped but kept out of totals until current use is known.'
  },
  s06: {
    text: ['Fire is a shared state layer, not a module: fuel load, risk and burn history per place and year[[ (charter s3)]]. Burned area is held as a union over years, never a sum. Places that never burned in the record are right-censored and stored as unknown[[ (ADR-0019)]]. Scrub regrowth since the last fire follows Eq 13. Burn requests are also evidence of current use (S08).'],
    eq: ['13'],
    data: 'ICNF burned areas 1975 to 2025[[ D60]], burning requests[[ D78/D79]], fuel-break network[[ D65]], fire layer v1[[ (Claude outputs/fire/fire_layer_v1_20261026/)]].',
    gaps: 'The fire layer is a history layer (v1). The fuel load and risk surface is not built yet and is work in progress. Scrub regrowth error bands are not carried yet (about 2x either way).',
    ledger: ['L005', 'L006', 'L007', 'L102']
  },
  s07: {
    text: ['Library route, olive tool layer v3: arising = tier area x tier rate x INE regional factor, plus scattered trees (Eq 1b). Tiers from declared density: traditional up to 100 trees/ha, intensive 101 to 700, super-intensive above 700.',
      'The INE factor for Centro stretches declared parcel area up to the census crop area, so it adds tonnes to the regional total, not tonnes per hectare. Monte Carlo on tier rates gives P5 to P95 ranges.',
      'The engine\'s current olive module uses a harvest route instead (area x ten-year yield x residue ratio, Eq 1), which its own design record calls the weaker form for a maintenance residue. Aligning the two is under review.',
      '[[Audit flags carried here: the management class in parcel data is a random draw (AUD-010, critical) and 455 regional supply factors are unsourced (AUD-011, critical).]]'],
    eq: ['1b', '1', '2'],
    data: 'iSIP 2024 declared density[[ D20/D21]], INE agricultural statistics[[ D10]], olive area and production[[ D28]].',
    ledger: ['L097', 'L098', 'L099']
  },
  s08: {
    text: ['Five fates per crop for nine crops[[ (PRF-201 to 278, pruning_fates_20261028.csv)]]. Shares close to one (Eq 4). Contestable = burned + chipped and left + other. Committed = firewood + sold. A derived tonnage inherits the worst grade in its vector.',
      'Evidence: national inventory burned shares, the 2009 agricultural census by crop area, and burn requests inside declared parcels 2023 to 2025[[ (PRAC-02)]].',
      '[[Incumbents such as biomass power plants are handled the same way: Mode A subtracts them first (engine default), Mode B lets new pathways bid against them.]]'],
    eq: ['4'],
    data: 'Burning requests[[ D78/D79]], INE census request[[ D77]], DGEG biomass consumption[[ P02]], current-use layer[[ (Claude outputs/end_use/current_use/current_use_20261027b.gpkg)]].',
    gaps: 'The undeclared "other" fate has no carbon treatment, so it is recorded as NO INFO. Olive fate shares are grade C to D.',
    ledger: ['L015', 'L016', 'L017', 'L018', 'L019', 'L020', 'L021']
  },
  s09: {
    text: ['Burn credit Eq 5 (national inventory 2026 factors, with a low arm on the IPCC residue row). Soil carbon foregone Eq 6 (RothC retention). N2O avoided Eq 7. Every contestable tonne carries its baseline type through the engine[[ (ADR-0030)]].',
      'Biogenic CO2 from burning is not charged, because the orchard took it up the season before. The soil horizon (100 or 20 years) is a declared switch.',
      '[[Under review: the library and engine use 44/12 in the soil arm, the auditor notes the stored 3.664 gives −210.26 instead of −210.41 (AUD-021).]]'],
    eq: ['5', '6', '7'],
    data: 'National inventory 2026, IPCC 2006 and 2019 factors, SoilGrids[[ D45]] and ESDAC soil carbon[[ D42]] (RothC runs).',
    ledger: ['L022', 'L023', 'L024', 'L025', 'L026', 'L027', 'L028']
  },
  s10: {
    text: ['Four constraints with four owners: ecological retention floor, technical recovery, economic accessibility, legal access[[ (ADR-0017)]]. The combination rule is a switch: product (Eq 10) or binding need (Eq 11, tool default).',
      'Steep olive floor on slope class IQFP 3 and above (Eq 9, 12). Flat chip-and-leave farms keep a removable share of 0.85 (0.70 to 1.0). Natura 2000 and national protected areas are a hard no-collection rule in the biodiversity design. The dry floor is converted to the arising\'s basis before subtraction[[ (ruling S2)]].',
      'Worked example on the 1.32 t DM/ha grove: on flat ground in the Centro 1.32 x 0.6 = 0.792 t DM/ha can leave. On steep ground 3.5 / (1.8 x 1.32) = 1.47, above 1, so the steep grove keeps everything.'],
    eq: ['8', '9', '10', '11', '12'],
    data: 'Copernicus DEM (slope)[[ D67]], SoilGrids[[ D45]], ESDAC soil carbon[[ D42/D43]], Natura 2000[[ D46]], ICNF protected areas[[ D61]], riparian zones[[ D70]].',
    gaps: 'The retention floor residence time is contested (1.8 vs 5.4 to 7.0 years) and listed under review. The composed removal mode mostly returns "unavailable". The protected-areas mask is not built in the engine yet (work in progress).',
    ledger: ['L029', 'L030', 'L031', 'L032', 'L033', 'L097', 'L100', 'L101']
  },
  s11: {
    text: ['Default collection design[[ (Aido, 27 and 28 Oct)]]: roadside piles, the crew loads, no containers on farms, every plot reachable by a farm track. Hand loading by work-study equation (Eq 14, 15[[, LOAD-01]]) with an ergonomic cap per worker per shift.',
      '[[LOAD-01 replaced the earlier flat 2.0 person-h/t (Aido, 27 Oct).]] A winter field trial on partner farms will test it. Loose prunings fill a truck by volume long before weight (Eq 16). Prunings arrive for collection from December to May[[ (DRY-01)]].'],
    eq: ['14', '15', '16'],
    data: 'Library parameter families for hand loading, bulk density and labour[[ (HDL, BDF, LAB: 10_REPOSITORY/02_parameters/LOAD01_TRN04_README, LIB07_README)]].',
    gaps: 'Stacking time per load is NO INFO, run at 0, 30 and 60 minutes.',
    ledger: ['L034', 'L036', 'L037', 'L038', 'L043']
  },
  s12: {
    text: ['Default collection design[[ (Aido, 27 and 28 Oct)]]: farmers pile at the roadside, the crew loads, no containers on farms, every plot reachable by a farm track. The engine also models hand loading of loose branches by work-study equation (Eq 14, 15[[, LOAD-01]]) with an ergonomic cap per worker per shift. Loose prunings fill a truck by volume long before weight (Eq 16), which is why the chipped chain is the one shown.','Option G: truck tiers from small vans to large rigid trucks, crew of 1, 2 or 3, chosen per catchment and feedstock[[ (src/logistics/option_g.py)]]. Setup per stop is the most influential collection number. Effective rate Eq 18. Delay on every clock Eq 19[[ (ADR-0032)]]. Payload Eq 16 with fill factor 0.9.',
      'No crane-fed or truck-mounted chippers: these are prunings, not whole trees. Feedstocks without measured chip densities use declared proxies, flagged on the result.'],
    eq: ['14', '16', '18', '19'],
    data: 'Library parameter families for chippers, chipper transport, chipper operation and chip density[[ (CHP, CHT, CHO, CHD, INS: CHP_TRN07, CHT_TRN08, CHO_INS_DR02, CHD_DR01 READMEs)]].',
    gaps: 'Chip densities for nuts, montado and matos are proxies. The tractor-chipper tier cannot be priced yet (no PTO chipper price), so it is left out here.',
    ledger: ['L034', 'L036', 'L037', 'L038', 'L039', 'L040', 'L041', 'L042', 'L043', 'L044', 'L049']
  },
  s13: {
    text: ['Routed haul on the OpenStreetMap graph with speeds by road class. The connector leg runs on farm track. The snap cap is a declared choice[[, held for Aido]]. Tractors are excluded from motorways (Eq 22[[, ADR-0029]]).',
      'Multi-stop collection: farm-to-farm trip clock (Eq 20) and the tour-length model (Eq 21, k calibrated on vehicle routing). Annual cost Eq 23, 24. Emissions Eq 25. Options are compared on a cost and emissions Pareto front and picked at a declared carbon price (Eq 26).',
      'Being coded: the per-catchment choice on the routed matrix, and a full routing solver after 30 November. Unreachable farms are reported as refused, never given a straight line.',
      'The route on screen is drawn for this site on the engine\'s road graph: farm tips are dead-end tracks, speeds by class (track 10, local 40, secondary 60, main 80 km/h), each tip sent to its nearest plant by travel time. It is not an engine run.'],
    eq: ['20', '21', '22', '23', '24', '25', '26'],
    data: 'OpenStreetMap (ODbL)[[ D13]], engine road graph[[ (05_infrastructure/derived/road_graph/)]], Copernicus DEM[[ D67]], speed rows[[ SPD-001 to 049]].',
    gaps: 'Collection costs moved several times as rulings landed. Only the current worked example is used[[, collaborator-only, engine run 3997489, refresh at Milestone 4]].',
    ledger: ['L044', 'L045', 'L046', 'L047', 'L050', 'L051', 'L052', 'L053', 'L054', 'L055']
  },
  s14: {
    text: ['A plant is sized to its catchment: the reach is enumerated and the plant is built at what it holds (Eq 27[[, ADR-0015]]). One cluster is one plant[[ (ADR-0025)]]. Capital accrues in calendar years (Eq 28[[, ADR-0014]]).',
      'Capital scales with a 0.6 power law, supplier-confirmed (tool default). Modular scaling (n units, shared buildings) is a sensitivity arm. Operating-cost exponents are a switch[[ (ADR-0026)]]. Discount rate 4% real in the tool, 2% in the reference sets. Seasonality as a monthly reconciliation with storage[[ (ADR-0016)]]. Candidate sites are fixed once[[ (ADR-0018)]].',
      'Depot options are designed and being coded. Grid connection distance matters for biomethane and power (gas grid tiers).',
      '[[Under review: the auditor notes the tool set scales modules n^0.95 and shared items n^0.65. The truck-size switch distance is being re-run after the delay factor and is not shown until Milestone 4.]]'],
    eq: ['27', '28'],
    data: 'OpenStreetMap[[ D13]], OpenInfraMap gas and power grid[[ D12]], CAOP[[ D59]], iSIP clusters.',
    ledger: ['L056', 'L057', 'L058']
  },
  s15: {
    text: ['Char mass Eq 29 and carbon in char Eq 30. Dry conversion always first: skipping it would overstate char by 7% for olive and 134% for food waste. Char yield and H/C by temperature from a property surface[[ (ADR-0007)]]. Process energy with fossil emissions only.',
      'Fixed plant (about 1 t/h) and mobile kiln as two technologies, with technology held as data[[ (ADR-0006)]]. Physical checks on every run: carbon closure, energy out not above energy in[[ (ADR-0022)]].',
      'Worked chain: 1 wet tonne x 0.937 dry matter x 0.26 char yield x 0.8408 carbon x 3.664 = 0.7505 t CO2e held in the char, before permanence.'],
    eq: ['29', '30'],
    data: 'Biochar workbook[[ (10_REPOSITORY/02_parameters/biochar_pyrolysis_v3_20261026.xlsx)]], feedstock carbon and heating value[[ (FCL)]], evidence library[[ LV01]].',
    gaps: 'The biomass dryer price and the lab cost per batch are NO INFO. Electricity and water figures carry conflicts between paper versions. Olive moisture basis not yet verified.',
    ledger: ['L059', 'L060', 'L061', 'L062', 'L063', 'L065', 'L066', 'L056']
  },
  s16: {
    text: ['Digestion screening Eq 31 (volatile solids times methane potential times 0.85). Woody prunings are ineligible. One basis per material: food waste is converted with its dry matter factor, and confusing wet and dry once produced a false disproof.',
      'Municipal food waste goes to digestion or gasification only, never to biochar[[ (Aido, 2 Oct)]] (EU fertiliser rule CMC 14). Cascades are a directed graph: digestate to pyrolysis[[ (ADR-0011)]]. The biomethane paper\'s package reproduces exactly across 278 municipalities. Grid connection tiers by distance, with a liquefied route beyond the last tier. Manure at farm level is work in progress.'],
    eq: ['31'],
    data: 'Biomethane workbook[[ (anaerobic_digestion_biomethane_v3_20261026.xlsx)]], municipal waste points and tonnage[[ L17/L18]], OpenInfraMap gas grid[[ D12]], manure layer (work in progress).',
    gaps: 'Biomethane is audited at a first pass only. Digestate yield is not held, so the cascade contributes zero with a note.',
    ledger: ['L067', 'L068', 'L069', 'L093']
  },
  s17: {
    text: ['Five configurations held: small CHP, mid-scale CHP, bio-SNG, biomass-to-liquid by Fischer-Tropsch, and char-optimised. Levelised cost per dry tonne. Feedstock eligibility by technology (ash, moisture, particle size). Fischer-Tropsch fuels enter as a price signal only[[ (V1 end-use ruling, 9 Oct)]].',
      'Status: designed and costed in the library, not yet a pathway in the engine. There is no composting pathway in the engine yet.'],
    data: 'Gasification workbook[[ (gasification_ft_btl_v2_20261019.xlsx, Claude outputs/technologies/gasification_btl_record_20261002.md)]].',
    ledger: ['L070', 'L071']
  },
  s18: {
    text: ['Willingness to pay Eq 35. Negative bids are reported, not clipped. Greedy allocation with mass balance (Eq 36). The next-best bid is recorded as the feedstock\'s honest price. Double counting measured (Eq 37).',
      'Open objectives as separate optimisations: fully sustainable, lowest cost, maximum removal, user target[[ (charter s4)]]. Trade-off frontier via a shadow carbon price (Eq 38[[, ADR-0018]]).',
      'Known asymmetry: avoided emissions are not monetised in bids[[ (AUD-027)]], which tilts the auction towards biochar as the carbon price rises. Credit class prices are not set yet[[ (AUD-038)]].'],
    eq: ['35', '36', '37', '38'],
    data: 'All upstream modules.',
    gaps: 'Gasification and compost are not engine pathways yet, and the "leave it" bid is not in the ledger, so those rows show NO INFO.[[ Bids from engine run 6da1854 (audit snapshot, 28 Oct), refresh at Milestones 4 and 6.]]',
    ledger: ['L072', 'L073', 'L074', 'L075', 'L076']
  },
  s19: {
    text: ['Sinks and end use: soil capacity per 1 km cell with dose scenarios and the EU cap, cement kilns, gas grid and heat users[[ (sections/4_end_use.md)]]. Emitters: facilities with verified emissions, plus airports and ports. Credits come from a national pool, while physical products follow real routes[[ (charter s4)]].',
      'Neutrality gap presets: the 2024 inventory, roadmap residuals or a user value, with a switch for international aviation and shipping. Removals and avoided emissions stay in separate columns. Status: layers built, engine wiring due in week 4 (work in progress).'],
    data: 'E-PRTR[[ D56]], EU ETS[[ D57/D58]], airports and ports layer, APA municipal emissions, OpenInfraMap gas grid[[ D12]], soil sink layer[[ (Claude outputs/end_use/sinks/end_use_sinks.gpkg)]].',
    gaps: 'The neutrality gap output is not built, so the gap bar has no fill value. The soil sink capacity grid uses ESDAC layers and stays out of the site for now.',
    ledger: ['L077', 'L078', 'L079', 'L080', 'L081', 'L082']
  },
  s20: {
    text: ['Net removal Eq 32 with permanence by named method[[ (ADR-0008)]]: physical Woolf 100 yr (the decided base), EU CRCF creditable 200 yr (Eq 33), submitted composite (reference run only, under audit). Certification gate on H/C_org (Eq 34[[, ADR-0003 still open]]).',
      'The physical check "credited carbon not above char carbon" is a hard failure. Biochar outperforms leaving chips on the soil after some years (RothC).',
      'Worked example: 0.7505 t CO2e in the char x 0.729 = 0.5471 t CO2e still stored after 100 years per wet tonne, 0.5431 net of plant operation.'],
    eq: ['32', '33', '34'],
    data: 'Permanence rows[[ bc_perm_001 to 095]] (biochar workbook), CRCF Delegated Regulation 2026/285, soil module (RothC runs).',
    gaps: 'The three framings disagree. The submitted composite is under audit and can exceed 1.0 in one model branch. Avoided emissions for this tonne are not in the ledger, so the avoided counter shows NO INFO.',
    ledger: ['L083', 'L084', 'L085', 'L086', 'L087', 'L064', 'L063']
  },
  s21: {
    text: ['Designed lens[[ (handed over 26 Oct)]]: tier 1 mean species abundance per parcel via a GLOBIO to COSc crosswalk with parcel rules for montado, matos and pine. Tier 2 habitat and bird directive richness per 10 km cell. Tier 3 residue-dependent groups over 20 practice bundles.',
      'One hard rule: no collection in Natura 2000 or national protected areas. Stumps, coarse wood and snags are never removed. The engine currently returns "unavailable, with a reason" rather than zero. Work in progress, a second paper with Filipa.'],
    data: 'COSc[[ D01 to D04]], Natura 2000[[ D46]], ICNF protected areas[[ D61]], ecological corridors[[ D62]], habitat maps[[ D68]], GLOBIO4 MSA.',
    ledger: ['L088']
  },
  s22: {
    text: ['The north star: choose options (region, feedstocks, pathways, collection, the sourced value for each key parameter), run the engine, get a mapped result per tonne and per feedstock down to parcels, then explore by adjusting the key uncertain parameters without rerunning everything.',
      'Objectives: fully sustainable, lowest cost, most optimised, maximum removal or a user target[[ (charter s4)]]. Every output is a range, with Monte Carlo over parameter ranges and sensitivity tornadoes.',
      'Trust: source and grade on every number, NO INFO never zero, named frozen parameter sets, a run record per run, physical checks (Eq 39), golden tests that reproduce the two published papers, and an independent audit. Adding a country is a data problem, not a rebuild.'],
    eq: ['39'],
    gaps: 'The full test suite was not run by the audit. The sensitivity framework is not built yet. Many engine parameters carry no uncertainty range yet.',
    ledger: ['L002', 'L003', 'L004', 'L089', 'L090', 'L091', 'L092', 'L093', 'L094']
  }
};
