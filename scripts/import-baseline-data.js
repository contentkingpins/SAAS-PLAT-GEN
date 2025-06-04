const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const path = require('path');

// Load database configuration
const databaseConfig = require('../database.config.js');

// Set DATABASE_URL from config
process.env.DATABASE_URL = databaseConfig.getDatabaseUrl();

const prisma = new PrismaClient();

// Helper function to generate MBI-like identifier
function generateMBI() {
  // Generate a format similar to MBI: 1ABC-DE2-FG34
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  
  return `${nums[Math.floor(Math.random() * 10)]}${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}-${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}${nums[Math.floor(Math.random() * 10)]}-${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}${nums[Math.floor(Math.random() * 10)]}${nums[Math.floor(Math.random() * 10)]}`;
}

// Helper function to parse date strings with various formats
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Handle various date formats in the CSV
  let cleanDate = dateStr.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  
  // Handle dates like "03/06/1986" or "3/13/1951" or "02/15//1945"
  const datePatterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,  // MM/DD/YY
  ];
  
  for (const pattern of datePatterns) {
    const match = cleanDate.match(pattern);
    if (match) {
      let month = parseInt(match[1]);
      let day = parseInt(match[2]);
      let year = parseInt(match[3]);
      
      // Convert 2-digit year to 4-digit
      if (year < 100) {
        year += year < 30 ? 2000 : 1900;
      }
      
      // Create date object
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
      }
    }
  }
  
  console.warn(`Could not parse date: ${dateStr}`);
  return null;
}

// Baseline CSV data
const baselineData = `Jill	Dupuis	04/21/1954	FEMALE	3330 Cleveland Ave	Groves	TX	77619	409-626-2734	IMMUNO
Jennifer	Duplessis	01/07/1953	FEMALE	1714 Southland Ct	Baton Rouge	LA	70810	504-722-5052	IMMUNO
Kristine	Stout	03/06/1986	FEMALE	311 Oakbourne Rd	West Chester	PA	19382	484-619-6173	IMMUNO
George	Findley Jr	04/18/1947	MALE	226 Patricia Rd	Madison	AL	35758	256-971-4019	NEURO
Clifford	Colby	04/24/1959	MALE	5 Vicki Cir	Buzzards Bay	MA	2532	774-216-9585	NEURO
Angeline	Martin	02/15//1945	FEMALE	543 W Scotch Rd	0	NJ	8534	609-737-2989	IMMUNO
Patrick	White	03/03/1949	MALE	,	Blaine	WA	98230	360-933-4715	NEURO
Minda	Waldridge	3/13/1951	FEMALE	150 Augusta Ave	Paducah	KY	42003	270-217-2569	IMMUNO
Lori	Shad	03/31/1957	FEMALE	100 Avante CT	Warner Robins	GA	31093	478-714-3646	NEURO
William	Hoffman	11/11/1953	MALE	424 Lark Dr	Grand Junction	CO	81504	970-216-0269	IMMUNO
George	Schimmele	09/13/1947	MALE	1118 18th ST S	New Ulm	MN	56073	507-217-9757	IMMUNO
Donna	Mundy	10/22/1955	FEMALE	1344 N Center RD	Boonville	IN	47601	812-925-6508	IMMUNO
Roger	Comstock	02/21/1952	MALE	512 Roth Rd	Sevierville	TN	37876	931-607-8341	NEURO
Linda	Goldsberry	03/04/1948	FEMALE	305 Church St	Walton	IN	46994	574-721-5038	NEURO
Edward	Childress	06/28/1952	MALE	963 Pinnacle Hotel Rd	Pinnacle	NC	27043	336-293-3503	NEURO
Brenda	Wolf	04/23/1953	FEMALE	6033 Alpine Estates Cir	Las Vegas	NV	89149	972-743-9926	IMMUNO
Richard	Bash	05/18/1947	MALE	2241 Brick Tavern Rd	Quakertown	PA	18951	215-605-2266	IMMUNO
Patricia	Abbamonte	9/21/1949	FEMALE	9016 Tow Hook Pl	Mechanicsville	VA	23116	804-514-7497	NEURO
Jeffry	Rosborg	06/18/1965	MALE	146 Newington Rd	West Hartford	CT	6110	860-218-5028	IMMUNO
Tamika	Sumpter	5/10/1974	FEMALE	1546 Rainer Rd	Brookhaven	PA	19015	484-485-0969	NEURO
Frances	Chandler	8/18/1943	FEMALE	560 Rivage Promenade	Wilmington	NC	28412	910-791-3781	IMMUNO
James	Walker	6/10/1956	MALE	6851 Whooping Crane Way	New Market	MD	21774	240-338-0902	IMMUNO
Virginia	Dulzer	3/27/1950	FEMALE	3652 Golfview Rd	Hope Mills	NC	28348	910-425-2534	IMMUNO
Carole	Swanson	4/25/1950	FEMALE	4344 E Lynne Ln	Phoenix	AZ	85042	602-561-3121	IMMUNO
Karen	Ciferni	06/27/1945	FEMALE	4814 Polo Gate Blvd	Charlotte	NC	28216	252-431-5417	IMMUNO
Ramon	Galindo	04/06/1947	MALE	735 Calle Mandarinas	Thousand Oaks	CA	91360	949-331-5100	IMMUNO
Allan	Kuchinsky	04/20/1944	MALE	500 Sunnyside Ave	Alamogordo	NM	88310	575-551-6474	IMMUNO
Mary	Schepers	10/25/1956	FEMALE	485 N Skyview Dr	Jasper	IN	47546	812-630-7772	NEURO
Maslahuddin	Durrani	6/26/1948	MALE	9300 Sanger St	Lorton	VA	22079	571-238-3690	IMMUNO
Barbara	Dinterman	10/10/1943	FEMALE	338 Fair Ave	Westminister	MD	21157	443-487-3054	IMMUNO
Damaris	Roberson	10/18/1953	FEMALE	251 Stockham Ave	Morrisville	PA	19067	215-295-8105	NEURO
Mark	Castellano	03/03/1955	MALE	55 Linden Ave	Berlin	CT	6037	860-828-4838	IMMUNO
Edna	Parker	05/11/1948	FEMALE	46 Allred Rd	Laurel	MS	39443	601-335-4104	IMMUNO
William	Campbell	06/23/1949	MALE	124 Creekview Dr	Stokesdale	NC	27357	610-554-9908	NEURO
Ralph	Lawson	08/23/1940	MALE	55 Lindsey Ln	Stafford	VA	22556	540-752-5927	NEURO
Linda	Schoenberger	08/30/1948	FEMALE	1580 Sephos St	Manteca	CA	95337	209-665-4955	NEURO
Raymond 	Rhea Jr	04/09/1948	MALE	3715 S 550 W	Syracuse	UT	84075	801-870-0550	NEURO
Harvey	Rice	03/09/1942	MALE	414 S Church St	Salisbury	NC	28144	704-433-8991	NEURO
Ramona 	Mc Gillan	04/29/1950	FEMALE	66 Lake Plymouth Blvd	Plymouth	CT	06782	860-283-6458	NEURO
Joan	Stofko	01/25/1951	FEMALE	2136 Menoher Blvd	Johnstown	PA	15905	814-255-7356	NEURO
Jennett	Sonner	08/01/1940	FEMALE	508 44th Ave E Lot D24	Bradenton	FL	34203	716-801-1888	NEURO
Kathryn	Sprague	11/07/1950	FEMALE	2708 Stoughton Way	Sacramento	CA	95827	916-361-8298	NEURO
Fay	Fair	05/07/1958	FEMALE	2020 Ladnier Rd Apt 11H	Gautier	MS	39553	228-235-4903	NEURO
Verna	Myers	12/24/1947	FEMALE	247 Glenwood Dr 	Madison	MS	39110	601-832-9486	NEURO
Jill	Moore	08/25/1948	FEMALE	3444 Table Rock Mountain Rd	Morganton	NC	28655	828-433-1306	NEURO
Alex	Wakefield	03/30/1985	MALE	1424 Jefferson St Unit B708	Oakland	CA	94612	510-706-7048	NEURO
Trudy	Schillo	09/14/1949	FEMALE	3419 Hwy 903 N	Stokes	NC	27884	704-806-6667	IMMUNO
John 	Slachta	05/06/1953	MALE	2015 Henderson Ave	New Bern	NC	28560	252-637-5058	NEURO
Betty	Day	12/25/1934	FEMALE	311 Spring Time Drive	Sebring	FL	33870	863-368-0359	IMMUNO
Charles	Cox	01/08/1944	MALE	594 Falling Creek Church Rd	Goldboro	NC	27530	919-738-8080	NEURO
Elizabeth	Ramos	11/30/1953	FEMALE	6402 Graves Ave	Van Nuys	CA	91406	213-675-0142	IMMUNO
Brenda	Bland Pulley	01/12/1950	FEMALE	9408 Perimeter Ct	Zebulon	NC	27597	973-668-8548	NEURO
Kathleen	Carpenter	06/25/1949	FEMALE	191 Woodbridge Rd	Coventry	CT	06238	401-465-1671	NEURO
Hazel	Hill	09/05/1949	FEMALE	906 W Southgate Dr	Shelby	NC	28152	704-480-8137	NEURO
Audrey	Bowman	07/08/1940	FEMALE	4911 Meckel Way	Sacramento	CA	95841	916-283-4019	IMMUNO
Joseph	Stonge	10/09/1941	MALE	13656 Nassau Dr	Victorville	CA	92395	760-245-4946	NEURO
Dennis	Hoggard	06/17/1968	MALE	208 W Academy St	Colerain	NC	27924	252-558-8971	IMMUNO
Oneil	Simmons	07/28/1945	MALE	30 Iris Dr	Four Oaks	NC	27524	919-963-2614	NEURO
Dondee	Woodall	08/23/1959	FEMALE	175 W Terrace St	Altadena	CA	91001	626-791-7030	IMMUNO
Helen	Cannie	04/02/1949	FEMALE	602 E Howard St #301	Bellefonte	PA	16823	814-571-1403	IMMUNO
Patricia	Lenfestey	10/10/1952	FEMALE	508 Florence Dr	Castle Hayne	NC	28429	910-675-2655	IMMUNO
Ann	Redwine	01/10/1951	FEMALE	80 Hidden Cove Ct	Val Paraiso	FL	32580	405-503-8021	NEURO
Albert	Perry	04/20/1947	MALE	7420 Wake Rd	Durham	NC	27713	919-697-6689	IMMUNO
Elizabeth	King	01/07/1952	FEMALE	191 Green Pasture Rd	Four Oaks	NC	27524	919-963-3235	IMMUNO
Mary	Martin	05/08/1940	FEMALE	6479 S Parfet Way	Littleton	CO	80127	303-933-4031	NEURO
Rosa	Chavez	04/05/1953	FEMALE	16265 Sitting Bull St	Victorville	CA	92395	909-522-1169	IMMUNO
Thomas	Braun	05/08/1936	Male	1008 S Walnut St	New Bremen	OH	45869	419-629-8902	NEURO
Carol	Kemmerer	08/09/1943	Female	2610 Stewart Dr	Rittman	OH	44270	330-335-7432	NEURO
Kenneth	Rutter	02/06/1942	Male	16 W. Oak Hill Lane 	Hendersonville	NC	28739	828-776-2389	NEURO
Larry 	Walz	12/24/1942	Male	523 Benton St	Belleville	IL	62220	618-416-8017	IMMUNO
Barbara	Zupko	08/27/1941	Female	6 Camellia Drive 	Mary Ester	FL	32569	850-586-7271	NEURO
Linda 	Reed	10/26/1952	Female 	15801 Clarendon St	Westminister	CA	92683	714-839-2964	NEURO
Charlotta	Winchell	02/24/1948	Female	12093 E County Road 1025 N	Evanston	IN	47531	812-529-8474	NEURO
Daniel	Gilliland	06/26/1953	Male	55 Cattle Run LN	Calabash	NC	28467	704-608-2255	NEURO
Patricia 	Johnson	09/13/1948	Female	211 S Morse Ave	Calumet	IA	51009	712-446-2655	IMMUNO
Robert	Burns	03/27/1951	Male	7620 William Penn Dr	Indianapolis	IN	46256	317-841-7983	NEURO
Sarah	Custer	01/08/1933	Female	11537 E Monterey Ave	Mesa	AZ	85209	602-339-4570	NEURO
John	Herman	01/04/1940	Male	17 Sycamore Hill CT	Lebanon	PA	17042	717-274-3527	IMMUNO
Lorraine	Richards	12/29/1935	Female	1001 Starkey Rd Lot 696	Largo	FL	33771	727-536-6288	NEURO
Gary 	Johnson	03/31/1939	Male	3441 60th St Apt 4B	Moline	IL	61265	309-797-9743	IMMUNO
Linda 	Dukes	09/30/1948	Female	10212 Meadow Glen Way	Louisville	KY	40241	502-424-3134	NEURO
Dorothea	Cecil	12/05/1940	Female	1017 Dreon Dr	Clawson	MI	48017	248-435-4059	NEURO
Betty	Harper	01/01/1949	Female	1508 Patricia dr Apt C	Lansdowne	PA	19050	267-541-5491	NEURO
Sue	Youngblood	07/30/1941	Female	1507 Blanton School Rd 	Woodbury	TN	37190	615-478-5240	IMMUNO
Algerine	Lewis	08/04/1944	Female	27777 Dequindre Apt 510	Madison Heights 	MI	48071	248-677-3271	IMMUNO
Leslie 	Burch	04/05/1932	Female	3460 Sam Houston Cr	Fort Collins	CO	80526	970-226-0196	NEURO
Hazel	Engelter	05/03/1938	Female	592 N June Dr	Mears	MI	49436	231-873-8129	NEURO
Mildred	Battle	11/08/1943	Female	1605 Chase St	Rocky mount	NC	27801	252-446-5051	IMMUNO
Trenna	Cayton	05/31/1955	Female 	5533 S Hoyne Ave	Chicago 	IL	60636	312-863-0905	NEURO
Charles	Fripp	02/27/1953	Male	1007 Goodwin ST	Beaufort	SC	29906	843-263-3320	IMMUNO
Thomasenia	Covington	04/04/1951	Female	1710 Stonewall Rd	Laurinburg	NC	28352	910-506-4558	IMMUNO
Rosemarie	McColl	02/26/1936	FEMALE	2740 Elsinore Dr	Waterford	MI	48328	248-681-0205	NEURO
Leauna	Williamson	05/28/1947	Female	101 Henry Camp Rd	Belmont	WV	26134	304-665-2567	IMMUNO
Brenda	Eckerly	12/15/1952	FEMALE	49560 W Seven Mile Rd	Northvillle	MI	48167	248-207-7050	IMMUNO
Thomas	Wileman	11/03/1958	MALE	2436 S 11th St	Ironton	OH	45638	740-532-9697	NEURO
Annie	Jones	12/05/0146	FEMALE	450 S Roy Wilkins Ave Apt 322	Louisville	KY	40203	502-709-4324	NEURO
John	Rialson	10/21/1945	MALE	1861 Monte Vista Drive	Hollister	CA	95023	831-635-9754	NEURO
Emile	Salisbury	11/21/1947	FEMALE	220 Audubon St	Henderson	KY	42420	423-304-5923	IMMUNO
Robert	Wesner	12/24/1948	MALE	8480 Carmody Rd	Watervliet	MI	49098	269-463-5050	NEURO
Melinda	Leonard	12/27/1956	FEMALE	1 Mayflower Ln	Billerica	MA	01821	978-208-4738	NEURO
Donna	Mackey	10/14/1943	FEMALE	24200 Cathedral 102	Redford	MI	48239	313-538-8359	NEURO
Dale	Jensen	07/17/1934	MALE	1357 park Plaza Dr	Long Beach	CA	90804	562-221-5304	IMMUNO
Madeline	Dyer McMahon	03/17/1942	FEMALE	2905 Sailfish St NE	Palm Bay	FL	32905	321-750-4391	NEURO
Susan	Gessner	09/30/1954	FEMALE	7 Whispering Oaks Dr	River Ridge	LA	70123	504-738-6755	IMMUNO
Linda	McIntosh	02/10/1948	FEMALE	200 Surrey Dr	Warner Robins	GA	31093	478-397-1907	NEURO
Joan	Jamrog	02/24/1943	FEMALE	36 William Ave	Warren	RI	02885	401-245-1969	IMMUNO
Robert	Lawson	05/09/1945	MALE	1365 Gwynedale Way	Lansdale	PA	19446	215-368-2331	NEURO
Salvador	Najarro	06/12/1963	MALE	137 Whitney St	San Francisco	CA	94131	415-550-8539	NEURO
Martha	McMahan	09/14/1947	FEMALE	2378 Interlackin Circle NW	Cleveland	TN	37312	423-618-8719	NEURO
Bonnie	Ayres	12/11/1953	FEMALE	20386 Flora Lane	Huntington Beach	CA	92646	541-961-1770	NEURO
Susie	Sutch	01/05/1942	FEMALE	2320 Cedar St	Berkeley	CA	94708	510-843-6861	IMMUNO
Priscilla	Tougas	03/07/1944	FEMALE	1015 Bentley Dr	Naples	FL	34110	239-566-7290	IMMUNO
Hilda	Clay	09/26/1946	FEMALE	136 Woodvale Dr	Hendersonville	TN	37075	615-824-2901	IMMUNO
Vivian	Blevins	10/22/1959	FEMALE	1529 Valley Dr A	Flatwoods	KY	41139	606-585-9576	IMMUNO
Ronald	Bennett	09/20/1947	MALE	3114 S Ocean Blvd Unit 402	HIghland Beach	FL	33487	561-350-9615	NEURO
Helen	Johnson	01/10/1940	FEMALE	6407 Border Ln	Shreveport	LA	71119	318-621-9305	IMMUNO
Bobbie	Shelton-Lonas	08/15/1942	FEMALE	4606 Hwy 41 #A-N	Eagleville	TN	37060	615-274-6282	IMMUNO
Patricia	Meeko	12/12/1946	FEMALE	16880 Skyline Blvd	Los Gatos	CA	95033	408-656-0997	NEURO
Juanita	Jeter	12/20/1946	FEMALE	3014 Great Oak Dr	Forestville	MD	20747	301-646-4585	IMMUNO
Shirley	Grizzle	02/01/1936	FEMALE	1144 Spencer Ave	Gallatin	TN	37066	615-675-4181	IMMUNO
Deborah	Troost	09/24/1949	FEMALE	491 W James Funk Rd	Lake Arthur	NM	88253	575-365-5105	IMMUNO
Pearlie	Brown	06/28/1937	FEMALE	2411 Crossman Ave	Dallas	TX	75212	214-747-5496	IMMUNO
Cynthia	Velasquez	08/24/1957	FEMALE	195 Dolomite Rd	Buda	TX	78610	210-854-8030	IMMUNO
Linda	Sipe	07/31/1945	FEMALE	10517 Getz Rd	Mount Carroll	IL	61053	815-244-4914	IMMUNO
Gerald	Barnes	10/07/1946	MALE	1451 E Boyer Dr	Tulare	CA	93274	559-303-8350	IMMUNO
Birdie	Stansell	12/02/1943	FEMALE	545 Caldwell Road	Griffin 	GA	30223	770-227-8492	IMMUNO
Samantha	Garza	01/12/1993	FEMALE	1957 East 39th Street	Lorain	OH	44055	440-654-7513	NEURO
Roe	Davis	05/11/1937	FEMALE	770 Oakdale Cir	Millersville	MD	21108	410-987-1976	NEURO
Ghulam	Gheljai	03/22/1937	FEMALE	2-C Cambridge Terrace Apartment C	Hackensack	NJ	07601	201-646-1107	NEURO
Mary	Remke	12/25/1945	FEMALE	5220 N Natoma Ave	Chicago	IL	60656	773-763-8910	IMMUNO
Bonnie	Gill	03/16/1943	FEMALE	805 Maple Crest DR	Lebanon	TN	37090	615-547-7083	IMMUNO
Sharon	Cavett	06/24/1940	FEMALE	1601 Academy Rd APT 334	Ponca City	OK	74604	580-761-3536	IMMUNO
Martha	Lewis	12/03/1946	FEMALE	11100 Blossom Bell Dr	Austin	TX	78758	512-436-8019	IMMUNO
Netta Bell	Girard	04/18/1938	FEMALE	105 Keylon Dr	Florence 	SC	29501	843-669-1655	NEURO
Paul	Mulvaney	06/16/1948	MALE	106 Leroy Ct	Summerville	SC	29485	843-873-1155	IMMUNO
Ruth	Schroeder	05/05/1936	FEMALE	2539 Orsova Way	Sarasota	FL	34231	941-922-5685	IMMUNO
Runette	Stevens	01/22/1940	FEMALE	2989 Richardson Mill Rd	Fort Valley	GA	31030	478-825-7775	NEURO
Douglas	Murkeldove	11/02/1952	MALE	5910 SW 15th 	Amarillo	TX	79106	806-206-3732	IMMUNO
Tracilyn	Bodwin	12/14/1975	FEMALE	826 Kay Kourt	Neenah	WI	54956	920-609-8881	NEURO
Carol T	Close	12/19/1940	FEMALE	1109 N Parker Dr	Janesville	WI	53545	608-752-7667	IMMUNO
Gladys	Browning	06/06/1948	FEMALE	2166 Vz County Road 2205 	Canton	TX	75103	903-316-5861	NEURO
Louis 	Herrera	03/01/1978	MALE	12815 Meehan Dr	Austin	TX	78727	512-373-9093	NEURO
Marjorie 	Harden	07/19/1938	FEMALE	388 Sylvester Rd Apt B18	Camilla 	GA	31730	229-330-0201	IMMUNO
Patricia	Robertson	12/15/1950	FEMALE	6183 Windlass Ave SE	Port Orchard	WA	98367	206-941-3013	NEURO
Tammy	Mathis	07/05/1970	FEMALE	2212 Winchester Dr	Georgetown	TX	78626	512-508-4987	NEURO
Joseph	Coleman	03/30/1950	MALE	4100 Emerson St	Wichita Falls	TX	76309	940-691-1716	IMMUNO
Virginia	Rivers	12/28/1944	FEMALE	1204 Bradley Rd	Bennettsville	SC	29512	843-479-8733	IMMUNO
Cynthia	Bowers	02/19/1955	FEMALE	10550 Baymeadows Rd 91	Jacksonville	FL	32256	904-563-2892	NEURO
Katherine	Brim	05/10/1940	FEMALE	1232 Bellemeade Blvd	Jacksonville	FL	32211	904-725-5815	NEURO
Lillie	Palmer	10/07/1949	FEMALE	815 N Greenwood St Apt 416	Lagrange	GA	30240	706-443-5053	NEURO
Elijah	Mason	10/10/1946	MALE	20040 Blackstone St	Detroit	MI	48219	313-541-8332	IMMUNO
Connie	Craig	01/25/1952	FEMALE	1496 N Pearl St	Richland Center	WI	53581	608-647-8193	NEURO
Loisann	Averitt	02/20/1947	FEMALE	3962 Lucas Lane	Valley Springs	CA	95252	209-923-3100	NEURO
Gloria	Stith	04/05/1941	FEMALE	103 Caropine DR	Myrtle Beach	SC	29575	843-650-0041	IMMUNO
Kay 	Hendricks	01/04/1944	FEMALE	4334 Springmoor Dr E	Jacksonville	FL	32225	904-568-4210	NEURO
Steven 	Delegal	02/25/1949	MALE	7812 Deerwood Pointe Ct	Jacksonville	FL	32256	904-485-6217	NEURO
Patricia	Wicker	05/09/1940	FEMALE	222 Robin Hood Ln	Granite Shoals	TX	78654	830-598-5702	NEURO
Judith R	Klutho	01/09/1940	FEMALE	505 E Lake Dr Apt # 203	Taylor	TX	76574	512-309-4383	IMMUNO
Richard	Gemp	01/14/1941	MALE	3939 Kuykendall Rd	Bellville	TX	77418	713-614-2001	NEURO
Margaret	Figueroa	11/17/1957	FEMALE	1508 North Ave	Corcoran	CA	93212	559-992-5878	IMMUNO
Peter	Luley	01/09/1942	MALE	6904 Boutwell lane E 	Temple	TX	76502	254-217-2488	IMMUNO
Tamson	Shaffer	10/05/1954	FEMALE	747 County Road 4330	Lampass	TX	76550	254-368-1511	NEURO
Patricia	Higginbotham	09/16/1941	FEMALE	2680 Armsdale Road	Jacksonville	FL	32218	904-477-2626	NEURO
Karen	Nordling	12/15/1956	FEMALE	512 Eberhart Ln Apt 1701	Austin	TX	78745	512-962-5713	NEURO
Sandra	Spiegelberg	10/25/1961	FEMALE	231 34th St	Cody	WY	82414	307-250-5716	IMMUNO
Mary	Hill	08/20/1958	FEMALE	205 San Jose St	New Iberia	LA	70563	337-492-3340	IMMUNO
Gerald	Fichter	02/03/1929	MALE	1001 Mulford Ct	Knightdale	NC	27545	919-266-6408	IMMUNO`;

async function importBaselineData() {
  console.log('Starting baseline data import...');
  
  try {
    // First, check if we have a default vendor to use
    let defaultVendor = await prisma.vendor.findFirst({
      where: { isActive: true }
    });
    
    if (!defaultVendor) {
      // Create a default baseline vendor
      defaultVendor = await prisma.vendor.create({
        data: {
          name: 'Baseline Data Import',
          code: 'BASELINE',
          staticCode: 'BASELINE_001',
          isActive: true
        }
      });
      console.log('Created default baseline vendor');
    }
    
    // Parse the CSV data
    const lines = baselineData.trim().split('\n');
    const leads = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Split by tab or multiple spaces
        const fields = line.split(/\t+|\s{2,}/).map(f => f.trim());
        
        if (fields.length < 10) {
          errors.push(`Line ${i + 1}: Insufficient fields (${fields.length})`);
          errorCount++;
          continue;
        }
        
        const [firstName, lastName, dob, gender, street, city, state, zipCode, phone, testType] = fields;
        
        // Skip empty or invalid entries
        if (!firstName || !lastName || !dob) {
          errors.push(`Line ${i + 1}: Missing required fields`);
          errorCount++;
          continue;
        }
        
        // Parse date of birth
        const dateOfBirth = parseDate(dob);
        if (!dateOfBirth) {
          errors.push(`Line ${i + 1}: Invalid date format: ${dob}`);
          errorCount++;
          continue;
        }
        
        // Convert IMMUNO to IMMUNE for database
        const normalizedTestType = testType === 'IMMUNO' ? 'IMMUNE' : testType;
        
        // Generate unique MBI
        let mbi;
        let mbiExists = true;
        let attempts = 0;
        
        while (mbiExists && attempts < 10) {
          mbi = generateMBI();
          const existing = await prisma.lead.findUnique({
            where: { mbi }
          });
          mbiExists = !!existing;
          attempts++;
        }
        
        if (mbiExists) {
          errors.push(`Line ${i + 1}: Could not generate unique MBI after 10 attempts`);
          errorCount++;
          continue;
        }
        
        // Create lead record
        const leadData = {
          mbi,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth,
          phone: phone || '',
          street: street || '',
          city: city || '',
          state: state || '',
          zipCode: zipCode || '',
          vendorId: defaultVendor.id,
          vendorCode: 'BASELINE',
          status: 'SUBMITTED',
          testType: normalizedTestType && ['IMMUNE', 'NEURO'].includes(normalizedTestType) ? normalizedTestType : null
        };
        
        const lead = await prisma.lead.create({
          data: leadData
        });
        
        leads.push(lead);
        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`Processed ${successCount} leads...`);
        }
        
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total lines processed: ${lines.length}`);
    console.log(`Successfully imported: ${successCount} leads`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n=== Error Details ===');
      errors.forEach(error => console.log(error));
    }
    
    console.log('\nBaseline data import completed!');
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importBaselineData(); 