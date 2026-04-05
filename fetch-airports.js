const https = require('https');
const fs = require('fs');
const path = require('path');

const url = "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json";
const outFile = path.join(__dirname, 'public', 'global_airports.json');

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const raw = JSON.parse(data);
            const parsed = [];
            for (const key in raw) {
                const a = raw[key];
                // Only include major airports with IATA codes
                if (a.iata && a.iata !== '' && a.iata !== '0') {
                    parsed.push({
                        iata: a.iata,
                        name: a.name,
                        city: a.city,
                        country: a.country,
                        coords: [a.lon, a.lat],
                        imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800' // Generic wide-shot placeholder
                    });
                }
            }
            fs.writeFileSync(outFile, JSON.stringify(parsed));
            console.log(`Successfully saved ${parsed.length} global airports to ${outFile}`);
        } catch (e) {
            console.error("Error parsing JSON", e);
        }
    });
}).on("error", (err) => {
    console.error("Error: " + err.message);
});
