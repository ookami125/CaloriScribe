BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "Ingredient" (
	"id"	INTEGER NOT NULL,
	"name"	TEXT NOT NULL,
	"barcode"	TEXT,
	"calories"	REAL NOT NULL,
	"protein"	REAL NOT NULL,
	"carbs"	REAL NOT NULL,
	"fat"	REAL NOT NULL,
	"unit"	TEXT NOT NULL,
	"createdAt"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	DATETIME NOT NULL,
	"allergens"	TEXT,
	"ingredientsList"	TEXT,
	"vitamins"	TEXT,
	"addedSugars"	REAL,
	"calciumMg"	REAL,
	"cholesterolMg"	REAL,
	"dietaryFiber"	REAL,
	"ironMg"	REAL,
	"potassiumMg"	REAL,
	"saturatedFat"	REAL,
	"servingSize"	TEXT,
	"servingsPerContainer"	TEXT,
	"sodiumMg"	REAL,
	"totalSugars"	REAL,
	"transFat"	REAL,
	"vitaminDMcg"	REAL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "Ingredient" ("id","name","barcode","calories","protein","carbs","fat","unit","createdAt","updatedAt","allergens","ingredientsList","vitamins","addedSugars","calciumMg","cholesterolMg","dietaryFiber","ironMg","potassiumMg","saturatedFat","servingSize","servingsPerContainer","sodiumMg","totalSugars","transFat","vitaminDMcg") VALUES (1,'Sus-hi large bowl (chicken tempura)',NULL,875.0,43.4,90.1,37.0,'bowl',1768069315054,1768079403023,NULL,'Garlic Brown Rice, Chicken Tempura x2, Cheese, Bacon, Edamame Beans, Pickled Jalapenos, Purple Cabbage, Tempura Flakes, Pickled Carrots, Mango Habanero x2',NULL,NULL,NULL,NULL,7.1,NULL,NULL,NULL,NULL,NULL,2088.0,20.1,NULL,NULL),
 (2,'Rehab Monster Peach Tea','070847021520',25.0,0.0,6.0,0.0,'can',1768069608444,1768078153488,'Coconut','Brewed tea (filtered water, black tea solids), glucose, peach juice concentrate, taurine, citric acid, sodium citrate, phosphoric acid, panax ginseng extract, magnesium lactate, calcium lactate, caffeine, monopotassium phosphate, acesulfame potassium, sucralose, d-calcium pantothenate (vit. b5), niacinamide (vit. b3), concentrated coconut water, salt, natural flavors, gum arabic, guarana extract, ester gum, quercetin dihydrate, inositol, d-glucuronolactone, l-carnitine l-tartrate, pyridoxine hydrochloride (vit. b6), acai fruit extract, goji berry extract, black tea extractives, cyanocobalamin (vit. b12).','Calcium Pantothenate, Pantothenic Acid, Nicotinamide, Niacin, Pyridoxine Hydrochloride, Vitamin B6, Cyanocobalamin, Vitamin B12',3.0,30.0,0.0,0.0,0.0,80.0,0.0,'1 can (458 g)','1',190.0,4.0,0.0,0.0),
 (3,'sliced BANANAS','646670511493',120.0,2.0,32.0,0.0,'cup',1768092381640,1768092381640,NULL,NULL,NULL,0.0,10.0,NULL,4.0,0.4,500.0,NULL,'1 cup (140 g)',NULL,NULL,17.0,NULL,NULL),
 (4,'Powdered Peanut Butter','850042128398',50.0,7.0,3.0,1.0,'scoop',1768092452504,1768092452504,'Peanuts','Roasted Peanuts',NULL,0.0,12.0,0.0,2.0,0.4,158.0,0.0,'1 scoop (12 g)',NULL,0.0,1.0,0.0,0.0),
 (5,'ISO 100 Hydrolyzed Protein Powder 100% Whey Protein Isolate','705016358205',110.0,25.0,2.0,0.0,'scoop',1768092469823,1768092469823,'Milk, Soybeans','HYDROLYZED WHEY PROTEIN ISOLATE, WHEY PROTEIN ISOLATE. LESS THAN 2% OF: NATURAL AND ARTIFICIAL FLAVORS, SALT, SOY LECITHIN, SUCRALOSE, STEVIOL GLYCOSIDES (STEVIA)',NULL,0.0,120.0,10.0,0.0,0.0,0.0,0.0,'1 scoop (30 g)',NULL,120.0,1.0,0.0,0.0),
 (6,'Original Almondmilk','194346193882',30.0,1.0,1.0,2.5,'cup',1768092488000,1768093639886,'Nuts','almondmilk (filtered water, almonds), less than 2% of: calcium carbonate, natural flavor, sea salt, dipotassium phosphate, gellan gum, sunflower lecithin, xantham gum, vitamin a palmitate, vitamin d, d-alpha-tocopherol (vitamin e)','Retinyl Palmitate, Vitamin D, D Alpha Tocopherol, Vitamin E',0.0,460.0,0.0,1.0,0.2,160.0,0.0,'1 cup (240 ml)',NULL,170.0,0.0,0.0,2.5),
 (7,'Beef Steak Breakfast Burrito (egg white, pepper jack)',NULL,460.0,28.0,46.0,18.0,'burrito',1768112751081,1768112751081,NULL,'Beef Steak Breakfast Burrito (Egg White Omelet: EGG WHITES, SOYBEAN OIL. CONTAINS 2% OR LESS OF THE FOLLOWING: MODIFIED FOOD STARCH, WHEY (MILK), SALT, NATURAL EGG FLAVOR, XANTHAN GUM, GUAR GUM., Tortilla: FLOUR TORTILLA BLEACHED WHEAT FLOUR (ENRICHED WITH NIACIN, REDUCED IRON, THIAMINE MONONITRATE, RIBOFLAVIN, FOLIC ACID), WATER, VEGETABLE OIL SHORTENING (INTERESTERIFIED SOYBEAN OIL, HYDROGENATED SOYBEAN OIL), SALT, CORN STARCH, SODIUM BICARBONATE, SODIUM ALUMINUM PHOSPHATE, MONO- AND DIGLYCERIDES, SUGAR, SODIUM STEAROYL LACTYLATE, RICE FLOUR, TO MAINTAIN FRESHNESS (FUMARIC ACID, POTASSIUM SORBATE, CALCIUM PROPIONATE), CALCIUM SULFATE, SODIUM SULFITE, ENZYMES, SODIUM METABISULFITE.., Beef Steak: COOKED SLICED BEEF COATED WITH: SODIUM CITRATE, SALT, MODIFIED FOOD STARCH, SODIUM DIACETATE, CARAMEL COLOR, SPICES (GARLIC POWDER BLACK PEPPER), FLAVORING (MUSTARD ONION POWDER), PAPRIKA, MALTODEXTRIN, HYDROLYZED CORN PROTEIN, GUAR GUM, GRILL FLAVOR, NATURAL SMOKE FLAVOR, CORN SYRUP SOLIDS. INGREDIENTS: BEEF, WATER, DEXTROSE, SODIUM PHOSPHATE, MODIFIED FOOD STARCH, SALT, AUTOLYZED YEAST, HYDROLYZED CORN PROTEIN., Pepper Jack Cheese: SLICED PEPPER JACK CHEESE (PASTEURIZED MILK, RED AND GREEN JALAPENO PEPPERS, CHEESE CULTURE, SALT, ENZYMES).)',NULL,1.0,230.0,40.0,1.0,2.9,510.0,7.0,'1 burrito','1',1280.0,3.0,NULL,NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "Ingredient_barcode_key" ON "Ingredient" (
	"barcode"
);
COMMIT;
