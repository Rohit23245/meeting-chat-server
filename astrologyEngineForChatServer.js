const Astronomy = require('astronomy-engine');

exports.calculateAstrology = (req, res) => {
  const data = req.body;
  
  if (!data) {
    return res.status(400).json({ error: "No input provided" });
  }

  // Ensure IST if timezone is missing, create UTC date
  const dob = data.dob || '2000-01-01';
  let tob = data.tob || '12:00:00';
  // If tob only has hours and minutes, append seconds
  if (tob.split(':').length === 2) {
    tob += ':00';
  }

  const dateStr = `${dob}T${tob}+05:30`;
  const dateObj = new Date(dateStr);

  if (isNaN(dateObj)) {
    return res.status(400).json({ error: "Invalid date constructed", dateStr });
  }

  const time = Astronomy.MakeTime(dateObj);

  // Simple Lahiri Ayanamsa Calculation
  const year = dateObj.getUTCFullYear() + (dateObj.getUTCMonth() / 12.0);
  const ayanamsa = 23.85 + (year - 2000) * (50.290966 / 3600.0);

  const bodies = [
    { name: 'Sun', astroBody: Astronomy.Body.Sun },
    { name: 'Moon', astroBody: Astronomy.Body.Moon },
    { name: 'Mars', astroBody: Astronomy.Body.Mars },
    { name: 'Mercury', astroBody: Astronomy.Body.Mercury },
    { name: 'Jupiter', astroBody: Astronomy.Body.Jupiter },
    { name: 'Venus', astroBody: Astronomy.Body.Venus },
    { name: 'Saturn', astroBody: Astronomy.Body.Saturn },
  ];

  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  const nakshatraData = [
    { name: "Ashwini", lord: "Ketu", yoni: "Ashwa", gana: "Deva", nadi: "Adi" },
    { name: "Bharani", lord: "Venus", yoni: "Gaja", gana: "Manushya", nadi: "Madhya" },
    { name: "Krittika", lord: "Sun", yoni: "Mesh", gana: "Rakshasa", nadi: "Antya" },
    { name: "Rohini", lord: "Moon", yoni: "Sarpa", gana: "Manushya", nadi: "Antya" },
    { name: "Mrigashira", lord: "Mars", yoni: "Sarpa", gana: "Deva", nadi: "Madhya" },
    { name: "Ardra", lord: "Rahu", yoni: "Shvan", gana: "Manushya", nadi: "Adi" },
    { name: "Punarvasu", lord: "Jupiter", yoni: "Marjar", gana: "Deva", nadi: "Adi" },
    { name: "Pushya", lord: "Saturn", yoni: "Mesh", gana: "Deva", nadi: "Madhya" },
    { name: "Ashlesha", lord: "Mercury", yoni: "Marjar", gana: "Rakshasa", nadi: "Antya" },
    { name: "Magha", lord: "Ketu", yoni: "Mushak", gana: "Rakshasa", nadi: "Antya" },
    { name: "Purva Phalguni", lord: "Venus", yoni: "Mushak", gana: "Manushya", nadi: "Madhya" },
    { name: "Uttara Phalguni", lord: "Sun", yoni: "Gau", gana: "Manushya", nadi: "Adi" },
    { name: "Hasta", lord: "Moon", yoni: "Mahish", gana: "Deva", nadi: "Adi" },
    { name: "Chitra", lord: "Mars", yoni: "Vyaghra", gana: "Rakshasa", nadi: "Madhya" },
    { name: "Swati", lord: "Rahu", yoni: "Mahish", gana: "Deva", nadi: "Antya" },
    { name: "Vishakha", lord: "Jupiter", yoni: "Vyaghra", gana: "Rakshasa", nadi: "Antya" },
    { name: "Anuradha", lord: "Saturn", yoni: "Mriga", gana: "Deva", nadi: "Madhya" },
    { name: "Jyeshtha", lord: "Mercury", yoni: "Mriga", gana: "Rakshasa", nadi: "Adi" },
    { name: "Mula", lord: "Ketu", yoni: "Shvan", gana: "Rakshasa", nadi: "Adi" },
    { name: "Purva Ashadha", lord: "Venus", yoni: "Vanar", gana: "Manushya", nadi: "Madhya" },
    { name: "Uttara Ashadha", lord: "Sun", yoni: "Nakul", gana: "Manushya", nadi: "Antya" },
    { name: "Shravana", lord: "Moon", yoni: "Vanar", gana: "Deva", nadi: "Antya" },
    { name: "Dhanishta", lord: "Mars", yoni: "Simha", gana: "Rakshasa", nadi: "Madhya" },
    { name: "Shatabhisha", lord: "Rahu", yoni: "Ashwa", gana: "Rakshasa", nadi: "Adi" },
    { name: "Purva Bhadrapada", lord: "Jupiter", yoni: "Simha", gana: "Manushya", nadi: "Adi" },
    { name: "Uttara Bhadrapada", lord: "Saturn", yoni: "Gau", gana: "Manushya", nadi: "Madhya" },
    { name: "Revati", lord: "Mercury", yoni: "Gaja", gana: "Deva", nadi: "Antya" }
  ];

  const rashiData = {
    "Aries": { lord: "Mars", tatva: "Fire", varna: "Kshatriya", vashya: "Chatushpad" },
    "Taurus": { lord: "Venus", tatva: "Earth", varna: "Vaishya", vashya: "Chatushpad" },
    "Gemini": { lord: "Mercury", tatva: "Air", varna: "Shudra", vashya: "Biped" },
    "Cancer": { lord: "Moon", tatva: "Water", varna: "Brahmin", vashya: "Jalchar" },
    "Leo": { lord: "Sun", tatva: "Fire", varna: "Kshatriya", vashya: "Chatushpad" },
    "Virgo": { lord: "Mercury", tatva: "Earth", varna: "Vaishya", vashya: "Biped" },
    "Libra": { lord: "Venus", tatva: "Air", varna: "Shudra", vashya: "Biped" },
    "Scorpio": { lord: "Mars", tatva: "Water", varna: "Brahmin", vashya: "Keet" },
    "Sagittarius": { lord: "Jupiter", tatva: "Fire", varna: "Kshatriya", vashya: "Biped/Chatushpad" },
    "Capricorn": { lord: "Saturn", tatva: "Earth", varna: "Vaishya", vashya: "Chatushpad/Jalchar" },
    "Aquarius": { lord: "Saturn", tatva: "Air", varna: "Shudra", vashya: "Biped" },
    "Pisces": { lord: "Jupiter", tatva: "Water", varna: "Brahmin", vashya: "Jalchar" }
  };

  const karanNames = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kintughna"];

  const planetsData = bodies.map(b => {
    const vec = Astronomy.GeoVector(b.astroBody, time, true);
    const ecl = Astronomy.Ecliptic(vec);
    const tropicalLon = ecl.elon;
    
    let siderealLon = tropicalLon - ayanamsa;
    if (siderealLon < 0) siderealLon += 360;
    
    const signIndex = Math.floor(siderealLon / 30);
    const sign = signs[signIndex];
    const normDegree = siderealLon % 30;
    const nakshatraIndex = Math.floor(siderealLon / (360 / 27));
    const nakshatra = nakshatraData[nakshatraIndex].name;
    
    const S = signIndex + 1;
    const part = Math.floor(normDegree / (30/9));
    let startSign = 1;
    if (S % 4 === 1) startSign = 1;
    else if (S % 4 === 2) startSign = 10;
    else if (S % 4 === 3) startSign = 7;
    else if (S % 4 === 0) startSign = 4;
    const navamshaIndex = (startSign - 1 + part) % 12;

    return {
      name: b.name,
      fullDegree: parseFloat(siderealLon.toFixed(4)),
      normDegree: parseFloat(normDegree.toFixed(4)),
      sign: sign,
      signIndex: signIndex,
      nakshatra: nakshatra,
      nakIndex: nakshatraIndex,
      navamsha_sign: signs[navamshaIndex],
      navamsha_signIndex: navamshaIndex,
      house: 1
    };
  });

  const lst = (time.ut / 24.0) * 360 + (parseFloat(data.lon) || 77.2); 
  const ascendantIndex = Math.floor(lst / 30) % 12;
  const ascDegree = lst % 30;

  const ascS = ascendantIndex + 1;
  const ascPart = Math.floor(ascDegree / (30/9));
  let ascStartSign = 1;
  if (ascS % 4 === 1) ascStartSign = 1;
  else if (ascS % 4 === 2) ascStartSign = 10;
  else if (ascS % 4 === 3) ascStartSign = 7;
  else if (ascS % 4 === 0) ascStartSign = 4;
  const ascNavamshaIndex = (ascStartSign - 1 + ascPart) % 12;

  const moonData = planetsData.find(p => p.name === 'Moon');
  const basic_details = {
    nakshatra: moonData.nakshatra,
    ascendant: signs[ascendantIndex >= 0 ? ascendantIndex : 0],
    sign: moonData.sign,
    gender: "Male"
  };

  const sunData = planetsData.find(p => p.name === 'Sun');
  let tithiDiff = moonData.fullDegree - sunData.fullDegree;
  if (tithiDiff < 0) tithiDiff += 360;

  const tithiIndex = Math.floor(tithiDiff / 12);
  const paksha = tithiIndex < 15 ? "Shukla" : "Krishna";
  const tithiNum = (tithiIndex % 15) + 1;
  const tithiNames = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi", tithiIndex < 15 ? "Purnima" : "Amavasya"];
  const tithiName = `${paksha} ${tithiNames[tithiNum - 1]}`;

  const karanIndex = Math.floor(tithiDiff / 6) % 11;
  const karanName = karanNames[karanIndex];

  const yogSum = (moonData.fullDegree + sunData.fullDegree) % 360;
  const yogIndex = Math.floor(yogSum / (360 / 27));
  const yogNames = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
  const yogName = yogNames[yogIndex];

  const charan = Math.floor((moonData.fullDegree % (360/27)) / (360/108)) + 1;

  const nMap = nakshatraData[moonData.nakIndex];
  const rMap = rashiData[moonData.sign];

  const kundli_details = {
      "nakshatra_lord": nMap.lord,
      "yog": yogName,
      "tithi": tithiName,
      "tatva": rMap.tatva,
      "paya": "Silver",
      "varna": rMap.varna,
      "sign_lord": rMap.lord,
      "yoni": nMap.yoni,
      "charan": charan,
      "karan": karanName,
      "yunjha": "Madhya",
      "name_alphabet": "A",
      "gana": nMap.gana,
      "nadi": nMap.nadi,
      "vashya": rMap.vashya,
      "nakshatra_paya": "Gold"
  };

  const day = parseInt(dob.split('-')[2]);
  const radicalSum = String(day).split('').reduce((a,b)=>a+parseInt(b),0);
  const radicalNumber = radicalSum > 9 ? String(radicalSum).split('').reduce((a,b)=>a+parseInt(b),0) : radicalSum;

  const fullDateSum = dob.replace(/-/g, '').split('').reduce((a,b)=>a+parseInt(b),0);
  let destinySum = fullDateSum;
  while(destinySum > 9) {
      destinySum = String(destinySum).split('').reduce((a,b)=>a+parseInt(b),0);
  }
  const destinyNumber = destinySum;

  const numMap = {
    1: { ruler: "Sun", day: "Sunday", color: "Orange", stone: "Ruby", god: "Surya", mantra: "Om Suryaya Namaha", friend: "2, 3, 9", evil: "4, 8" },
    2: { ruler: "Moon", day: "Monday", color: "White", stone: "Pearl", god: "Shiva", mantra: "Om Somaya Namaha", friend: "1, 3, 9", evil: "4, 5" },
    3: { ruler: "Jupiter", day: "Thursday", color: "Yellow", stone: "Yellow Sapphire", god: "Vishnu", mantra: "Om Brihaspataye Namaha", friend: "1, 2, 9", evil: "5, 6" },
    4: { ruler: "Rahu", day: "Saturday", color: "Grey", stone: "Hessonite", god: "Ganesha", mantra: "Om Rahave Namaha", friend: "5, 7, 8", evil: "1, 2" },
    5: { ruler: "Mercury", day: "Wednesday", color: "Green", stone: "Emerald", god: "Narayan", mantra: "Om Budhaya Namaha", friend: "1, 4, 6", evil: "2, 9" },
    6: { ruler: "Venus", day: "Friday", color: "White/Pink", stone: "Diamond", god: "Lakshmi", mantra: "Om Shukraya Namaha", friend: "4, 5, 8", evil: "1, 2" },
    7: { ruler: "Ketu", day: "Tuesday", color: "Multicolor", stone: "Cat's Eye", god: "Ganesha", mantra: "Om Ketave Namaha", friend: "4, 5, 8", evil: "1, 2" },
    8: { ruler: "Saturn", day: "Saturday", color: "Black/Blue", stone: "Blue Sapphire", god: "Shani", mantra: "Om Shanischaraya Namaha", friend: "4, 5, 6", evil: "1, 2" },
    9: { ruler: "Mars", day: "Tuesday", color: "Red", stone: "Red Coral", god: "Hanuman", mantra: "Om Bhaumaya Namaha", friend: "1, 2, 3", evil: "4, 5" }
  };
  const fMap = numMap[radicalNumber] || numMap[1];

  const favourable = {
      "destiny_number": destinyNumber,
      "evil_number": fMap.evil,
      "lucky_day": fMap.day,
      "lucky_mantra": fMap.mantra,
      "lucky_stone": fMap.stone,
      "friendly_number": fMap.friend,
      "radical_number": radicalNumber,
      "name_number": destinyNumber,
      "lucky_color": fMap.color,
      "lucky_god": fMap.god,
      "lucky_metal": radicalNumber % 2 === 0 ? "Silver" : "Gold",
      "lucky_substone": "Crystal",
      "neutral_number": "7",
      "radical_ruler": fMap.ruler
  };

  res.json({
    planets: planetsData,
    ascendant_d1: ascendantIndex,
    ascendant_d9: ascNavamshaIndex,
    basic_details: basic_details,
    kundli_details: kundli_details,
    favourable: favourable
  });
};
