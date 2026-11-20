const swisseph = require('swisseph');
swisseph.swe_set_ephe_path(__dirname + '/ephe');
swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

const dateObj = new Date("2000-01-01T12:00:00+05:30");
const hour = dateObj.getUTCHours() + (dateObj.getUTCMinutes() / 60.0) + (dateObj.getUTCSeconds() / 3600.0);
const julday = swisseph.swe_julday(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, dateObj.getUTCDate(), hour, swisseph.SE_GREG_CAL);

try {
    const houses = swisseph.swe_houses_ex(julday, swisseph.SEFLG_SIDEREAL, 28.6139, 77.2090, 'P');
    console.log("Houses:", houses);
} catch (e) {
    console.log("Error sync:", e.message);
}

try {
    swisseph.swe_houses_ex(julday, swisseph.SEFLG_SIDEREAL, 28.6139, 77.2090, 'P', function(res) {
        console.log("Houses async:", res);
    });
} catch (e) {
    console.log("Error async:", e.message);
}
