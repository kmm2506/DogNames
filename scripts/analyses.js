let db;
const nationalCtx = document.getElementById('nationalChart').getContext('2d');
const regionalCtx = document.getElementById('regionalChart').getContext('2d');
const municipalitySelect = document.getElementById("regionSelect");
const chartFilterRadios = document.getElementsByName("chartFilter");
const limitInput = document.getElementById("limitInput");
let totalRecords = {
    name: [],
    year: [],
    gender: [],
    breed: []
};
let regionalChart;

loadDatabase().then(() => {
    const municipalities = db.exec("SELECT DISTINCT municipality FROM dogs ORDER BY municipality")[0].values.map(row => row[0]);
    municipalitySelect.innerHTML = "<option value='%'>Всички общини</option>" +
        municipalities.map(municipality => `<option value="${municipality}">${municipality}</option>`).join("");

    // national chart
    const nationalData = db.exec("SELECT municipality, COUNT(*) as count FROM dogs GROUP BY municipality ORDER BY count DESC")[0].values;
    let labels = nationalData.map(row => row[0]);
    let data = nationalData.map(row => row[1]);
    let backgroundColors = generateColors(labels.length);

    new Chart(nationalCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Брой записи',
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'left'
                }
            }
        }
    });

    // generate total records
    let pairs = db.exec("SELECT municipality, COUNT(*) FROM dogs WHERE name IS NOT NULL GROUP BY municipality")[0].values;
    totalRecords.name = pairs.map(row => ({ municipality: row[0], count: row[1] }));
    totalRecords.name.push({ municipality: "%", count: pairs.reduce((acc, row) => acc + row[1], 0) });

    pairs = db.exec("SELECT municipality, COUNT(*) FROM dogs WHERE registration_date IS NOT NULL GROUP BY municipality")[0].values;
    totalRecords.year = pairs.map(row => ({ municipality: row[0], count: row[1] }));
    totalRecords.year.push({ municipality: "%", count: pairs.reduce((acc, row) => acc + row[1], 0) });

    pairs = db.exec("SELECT municipality, COUNT(*) FROM dogs WHERE gender IS NOT NULL GROUP BY municipality")[0].values;
    totalRecords.gender = pairs.map(row => ({ municipality: row[0], count: row[1] }));
    totalRecords.gender.push({ municipality: "%", count: pairs.reduce((acc, row) => acc + row[1], 0) });

    pairs = db.exec("SELECT municipality, COUNT(*) FROM dogs WHERE breed IS NOT NULL GROUP BY municipality")[0].values;
    totalRecords.breed = pairs.map(row => ({ municipality: row[0], count: row[1] }));
    totalRecords.breed.push({ municipality: "%", count: pairs.reduce((acc, row) => acc + row[1], 0) });

    // regional chart
    updateRegionalChart();
});

async function loadDatabase() {
    const SQL = await initSqlJs();
    const response = await fetch("data/data.db");
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    db.create_function('UNICODE_PROPER', (str) => {
        if (!str) return '';
        return str.split(' ').map(word => word.charAt(0).toLocaleUpperCase('bg-BG') + word.slice(1).toLocaleLowerCase('bg-BG')).join(' ');
    });
}

function updateRegionalChart() {
    // query database for selected filter and municipality
    const selectedFilter = Array.from(chartFilterRadios).find(radio => radio.checked)?.value;
    const column = selectedFilter === "year" ? "STRFTIME('%Y', registration_date)" : selectedFilter;

    const statement = db.prepare(`SELECT UNICODE_PROPER(${column}), COUNT(*) as count FROM dogs
        WHERE ${column} IS NOT NULL
        AND municipality LIKE ?
        GROUP BY UNICODE_PROPER(${column})
        ORDER BY count DESC LIMIT ?`);
    statement.bind([municipalitySelect.value, limitInput.value]);
    const result = [];
    while (statement.step()) {
        result.push(statement.get());
    }

    // prepare chart
    data = result.map(row => row[1]);
    const topCount = data.reduce((a, b) => a + b, 0);
    const othersCount = totalRecords[selectedFilter].find(record => record.municipality === municipalitySelect.value)?.count - topCount || 0;
    
    labels = result.map(row => row[0]);
    
    backgroundColors = generateColors(labels.length);

    if (othersCount !== 0) {
        data.push(othersCount);
        labels.push("Други");
        backgroundColors.push("#d3d3d3");
    }

    // make chart
    if (regionalChart) {
        regionalChart.destroy();
    }
    regionalChart = new Chart(regionalCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Брой кучета',
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}


function generateColors(numberOfColors, saturation = 90, lightness = 70) {
    const colors = [];
    for (let i = 0; i < numberOfColors; i++) {
        const hue = Math.floor((i * 360) / numberOfColors);
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
}