let swisseph = null;
try {
    swisseph = require('swisseph');
    const path = require('path');
    swisseph.swe_set_ephe_path(path.join(__dirname, 'node_modules', 'swisseph', 'ephe'));
} catch (e) {
    console.error("Warning: swisseph module is missing or not compiled. Astrology features will not work.");
}

function calculateVargas(signIndex, normDegree) {
  let s = signIndex;
  let d = normDegree;
  
  let d2 = (s % 2 === 0) ? (d < 15 ? 4 : 3) : (d < 15 ? 3 : 4);
  let d3 = (s + Math.floor(d / 10) * 4) % 12;
  let d4 = (s + Math.floor(d / 7.5) * 3) % 12;
  let d7_part = Math.floor(d / (30/7));
  let d7 = (s % 2 === 0) ? (s + d7_part) % 12 : (s + 6 + d7_part) % 12;
  let d10_part = Math.floor(d / 3);
  let d10 = (s % 2 === 0) ? (s + d10_part) % 12 : (s + 8 + d10_part) % 12;
  let d12 = (s + Math.floor(d / 2.5)) % 12;
  let d60 = (s + Math.floor(d * 2) % 12) % 12;
  
  return { d2, d3, d4, d7, d10, d12, d60 };
}

exports.calculateAstrology = (req, res) => {
  if (!swisseph) {
    return res.status(500).json({ error: "Astrology engine is currently unavailable due to a native module compilation issue. Please install Visual Studio 2022 to fix it." });
  }
  const data = req.body;
  
  if (!data) {
    return res.status(400).json({ error: "No input provided" });
  }

  // Ensure IST if timezone is missing, create UTC date
  const dob = data.dob || '2000-01-01';
  let tob = data.tob || '12:00:00';
  if (tob.split(':').length === 2) {
    tob += ':00';
  }

  const dateStr = `${dob}T${tob}+05:30`;
  const dateObj = new Date(dateStr);

  if (isNaN(dateObj)) {
    return res.status(400).json({ error: "Invalid date constructed", dateStr });
  }

  // Calculate UTC decimal hour
  const hour = dateObj.getUTCHours() + (dateObj.getUTCMinutes() / 60.0) + (dateObj.getUTCSeconds() / 3600.0);
  const julday = swisseph.swe_julday(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, dateObj.getUTCDate(), hour, swisseph.SE_GREG_CAL);

  // Set Lahiri Ayanamsa
  swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

  const bodies = [
    { name: 'Sun', astroBody: swisseph.SE_SUN },
    { name: 'Moon', astroBody: swisseph.SE_MOON },
    { name: 'Mars', astroBody: swisseph.SE_MARS },
    { name: 'Mercury', astroBody: swisseph.SE_MERCURY },
    { name: 'Jupiter', astroBody: swisseph.SE_JUPITER },
    { name: 'Venus', astroBody: swisseph.SE_VENUS },
    { name: 'Saturn', astroBody: swisseph.SE_SATURN },
    { name: 'Rahu', astroBody: swisseph.SE_TRUE_NODE }
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

  let planetsData = bodies.map(b => {
    // swisseph calculates sidereal out of the box with these flags
    const pos = swisseph.swe_calc_ut(julday, b.astroBody, swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SWIEPH);
    let siderealLon = pos.longitude;
    
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

    const vargas = calculateVargas(signIndex, normDegree);

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
      d2_signIndex: vargas.d2,
      d3_signIndex: vargas.d3,
      d4_signIndex: vargas.d4,
      d7_signIndex: vargas.d7,
      d10_signIndex: vargas.d10,
      d12_signIndex: vargas.d12,
      d60_signIndex: vargas.d60,
      house: 1
    };
  });

  // Calculate Ketu
  const rahuData = planetsData.find(p => p.name === 'Rahu');
  if (rahuData) {
      let ketuLon = (rahuData.fullDegree + 180) % 360;
      const signIndex = Math.floor(ketuLon / 30);
      const normDegree = ketuLon % 30;
      const nakshatraIndex = Math.floor(ketuLon / (360 / 27));
      const S = signIndex + 1;
      const part = Math.floor(normDegree / (30/9));
      let startSign = 1;
      if (S % 4 === 1) startSign = 1;
      else if (S % 4 === 2) startSign = 10;
      else if (S % 4 === 3) startSign = 7;
      else if (S % 4 === 0) startSign = 4;
      const navamshaIndex = (startSign - 1 + part) % 12;
      
      const vargas = calculateVargas(signIndex, normDegree);

      planetsData.push({
          name: 'Ketu',
          fullDegree: parseFloat(ketuLon.toFixed(4)),
          normDegree: parseFloat(normDegree.toFixed(4)),
          sign: signs[signIndex],
          signIndex: signIndex,
          nakshatra: nakshatraData[nakshatraIndex].name,
          nakIndex: nakshatraIndex,
          navamsha_sign: signs[navamshaIndex],
          navamsha_signIndex: navamshaIndex,
          d2_signIndex: vargas.d2,
          d3_signIndex: vargas.d3,
          d4_signIndex: vargas.d4,
          d7_signIndex: vargas.d7,
          d10_signIndex: vargas.d10,
          d12_signIndex: vargas.d12,
          d60_signIndex: vargas.d60,
          house: 1
      });
  }

  // Accurate Ascendant calculation using swisseph.swe_houses_ex
  const lat = parseFloat(data.lat) || 28.6139;
  const lon = parseFloat(data.lon) || 77.2090;
  // swisseph houses returns { ascendant, mc, armc, vertex, ... } depending on wrapper, but usually we just calculate sidereal time.
  // Actually, we can use swe_houses_ex. But to be safe if wrapper doesn't support houses well, we'll do sidereal time manually with Ayanamsa.
  
  // Find exact sidereal time for Ascendant
  // But wait, the standard astrologyEngineForChatServer used a simple LST formula.
  const lst = (hour / 24.0) * 360 + lon; // Simplistic approach used earlier
  // For true accuracy we should use swe_houses.
  let ascDegree = 0;
  let ascendantIndex = 0;
  let debugError = "";
  try {
      const houses = swisseph.swe_houses_ex(julday, swisseph.SEFLG_SIDEREAL, lat, lon, 'P');
      if (houses && houses.ascendant) {
          const ascLon = houses.ascendant;
          ascendantIndex = Math.floor(ascLon / 30) % 12;
          ascDegree = ascLon % 30;
      } else {
          debugError = "houses.ascendant is undefined. keys: " + (houses ? Object.keys(houses).join(',') : 'null');
          ascendantIndex = Math.floor(lst / 30) % 12;
          ascDegree = lst % 30;
      }
  } catch (e) {
      debugError = "Exception in swe_houses_ex: " + e.message;
      try {
          const houses = swisseph.swe_houses(julday, lat, lon, 'P');
          const ayan = swisseph.swe_get_ayanamsa_ut(julday);
          let ascLon = houses.ascendant - ayan;
          if (ascLon < 0) ascLon += 360;
          ascendantIndex = Math.floor(ascLon / 30) % 12;
          ascDegree = ascLon % 30;
          debugError += " | But swe_houses fallback succeeded!";
      } catch (e2) {
          debugError += " | Exception in swe_houses: " + e2.message;
          ascendantIndex = Math.floor(lst / 30) % 12;
          ascDegree = lst % 30;
      }
  }

  const ascS = ascendantIndex + 1;
  const ascPart = Math.floor(ascDegree / (30/9));
  let ascStartSign = 1;
  if (ascS % 4 === 1) ascStartSign = 1;
  else if (ascS % 4 === 2) ascStartSign = 10;
  else if (ascS % 4 === 3) ascStartSign = 7;
  else if (ascS % 4 === 0) ascStartSign = 4;
  const ascNavamshaIndex = (ascStartSign - 1 + ascPart) % 12;
  const ascVargas = calculateVargas(ascendantIndex, ascDegree);

  // Now assign accurate houses and formatted degrees
  planetsData = planetsData.map(p => {
      p.house = (p.signIndex - ascendantIndex + 12) % 12 + 1;
      const d = Math.floor(p.normDegree);
      const m = Math.floor((p.normDegree - d) * 60);
      p.formattedDegree = `${d}° ${m}'`;
      return p;
  });

  const moonData = planetsData.find(p => p.name === 'Moon');
  const basic_details = {
    nakshatra: moonData.nakshatra,
    ascendant: signs[ascendantIndex >= 0 ? ascendantIndex : 0],
    sign: moonData.sign,
    gender: data.gender || "Male"
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

  const dayParsed = parseInt(dob.split('-')[2]);
  const radicalSum = String(dayParsed).split('').reduce((a,b)=>a+parseInt(b),0);
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
    ascendant_d2: ascVargas.d2,
    ascendant_d3: ascVargas.d3,
    ascendant_d4: ascVargas.d4,
    ascendant_d7: ascVargas.d7,
    ascendant_d10: ascVargas.d10,
    ascendant_d12: ascVargas.d12,
    ascendant_d60: ascVargas.d60,
    basic_details: basic_details,
    kundli_details: kundli_details,
    favourable: favourable
  });
};
