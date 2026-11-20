function calculateVargas(signIndex, normDegree) {
  let s = signIndex;
  let d = normDegree;
  
  let d2 = (s % 2 === 0) ? (d < 15 ? 4 : 3) : (d < 15 ? 3 : 4);
  let d3 = (s + Math.floor(d / 10) * 4) % 12;
  let d4 = (s + Math.floor(d / 7.5) * 3) % 12;
  let d7_part = Math.floor((d * 7) / 30);
  let d7 = (s % 2 === 0) ? (s + d7_part) % 12 : (s + 6 + d7_part) % 12;
  let d10_part = Math.floor(d / 3);
  let d10 = (s % 2 === 0) ? (s + d10_part) % 12 : (s + 8 + d10_part) % 12;
  let d12 = (s + Math.floor(d / 2.5)) % 12;
  let d60 = (s + Math.floor(d * 2) % 12) % 12;
  
  return { s, d, d2, d3, d4, d7, d10, d12, d60 };
}

// Test cases
console.log("Aries 5 degrees", calculateVargas(0, 5));
console.log("Aries 15 degrees", calculateVargas(0, 15));
console.log("Aries 25 degrees", calculateVargas(0, 25));
console.log("Taurus 5 degrees", calculateVargas(1, 5));
console.log("Taurus 15 degrees", calculateVargas(1, 15));
