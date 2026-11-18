let db;
const nationalCtx = document.getElementById('nationalChart').getContext('2d');
const regionalCtx = document.getElementById('regionalChart').getContext('2d');
const municipalitySelect = document.getElementById("regionSelect");
const chartFilterRadios = document.getElementsByName("chartFilter");
const limitInput = document.getElementById("limitInput");
const greekCtx = document.getElementById('greekChart').getContext('2d');
const titlesCtx = document.getElementById('royalTitleChart').getContext('2d');
const dessertCtx = document.getElementById('dessertChart').getContext('2d');
const animalCtx = document.getElementById('animalChart').getContext('2d');
const plantCtx = document.getElementById('plantChart').getContext('2d');
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
                backgroundColor: backgroundColors
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

    updateRegionalChart();
    createGreekNamesChart();
    createNamesWithTitleChart();
    createDessertNamesChart();
    createAnimalNamesChart();
    createPlantNamesChart();
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
    db.create_function('FIRST_WORD_PROPER', (str) => {
        if (!str) return '';
        const word = str.split(' ')[0];
        return word.charAt(0).toLocaleUpperCase('bg-BG') + word.slice(1).toLocaleLowerCase('bg-BG');
    })
}

function updateRegionalChart() {
    // query database for selected filter and municipality
    const selectedFilter = Array.from(chartFilterRadios).find(radio => radio.checked)?.value;
    const column = selectedFilter === "year" ? "STRFTIME('%Y', registration_date)" : selectedFilter;
    const otherLabel = selectedFilter === "year" ? "Предишни години" : "Други";
    const orderby = selectedFilter === "year" ? "STRFTIME('%Y', registration_date)" :
        selectedFilter === "gender" ? "gender" : "count";
    const limit = selectedFilter === "gender" ? 2 : limitInput.value;
    limitInput.disabled = selectedFilter === "gender";

    const statement = db.prepare(`SELECT UNICODE_PROPER(${column}), COUNT(*) as count FROM dogs
        WHERE ${column} IS NOT NULL
        AND municipality LIKE ?
        GROUP BY UNICODE_PROPER(${column})
        ORDER BY ${orderby} DESC LIMIT ?`);
    statement.bind([municipalitySelect.value, limit]);
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
    borderColors = generateColors(labels.length, 90, 50);

    if (othersCount !== 0) {
        data.push(othersCount);
        labels.push(otherLabel);
        backgroundColors.push("#d3d3d3");
        borderColors.push("#bbbbbb");
    }

    let datasets;
    let type;
    switch (selectedFilter) {
        case "name":
            datasets = [{
                data: data,
                backgroundColor: backgroundColors
            }];
            type = "doughnut";
            break;
        case "year":
            datasets = [{
                data: data,
                borderColor: "#888888",
                borderWidth: 2
            }];
            type = "line";
            break;
        case "gender":
            datasets = [{
                data: data,
                backgroundColor: ["#5fcaff", "#ff8dc6"]
            }];
            type = "pie";
            break;
        case "breed":
            datasets = [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
            }];
            type = "bar";
            break;
    }

    // make chart
    if (regionalChart) {
        regionalChart.destroy();
    }
    regionalChart = new Chart(regionalCtx, {
        type: type,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            plugins: {
                legend: {
                    display: (selectedFilter === "name" || selectedFilter === "gender"),
                    position: "right"
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

function createGreekNamesChart() {
    const selectedNames = `("Хера", "Арес", "Хадес", 
        "Зевс", "Посейдон", "Аполон", 
        "Венера", "Уран", "Гая", 
        "Юпитер", "Марс", "Персей",
        "Икар", "Хелиос", "Хаос",
        "Атина", "Артемида", "Хермес",
        "Ерос", "Харпия", "Троя",
        "Пенелопе", "Ахил", "Нестор",
        "Кратос", "Деймос", "Пандора",
        "Парис", "Орфей"
    )`;
    const result = db.exec(`
        SELECT UNICODE_PROPER(name), COUNT(*) as count
        FROM dogs
        WHERE name IS NOT NULL
        AND UNICODE_PROPER(name) IN ${selectedNames}
        GROUP BY UNICODE_PROPER(name)
        ORDER BY count DESC
    `)[0].values;

    const labels = result.map(row => row[0]);
    const data = result.map(row => row[1]);

    //const backgroundColors = generateColors(labels.length);
    

    new Chart(greekCtx,
        {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Брой кучета',
                    data: data,
                    backgroundColor: ["#2f4c5c", "#f8b0f8"],
                    
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

function createNamesWithTitleChart() {
    const result = db.exec(
        `SELECT FIRST_WORD_PROPER(name) as prefix,
        COUNT(*) as count FROM dogs
        WHERE name IS NOT NULL AND prefix IN
        ('Дон', 'Крал', 'Цар', 'Император', 'Граф', 'Принц', 'Принцеса', 'Сър', 'Лейди', 'Сеньорита', 'Мис', 'Ms', 'Mr', 'Мистър')
        GROUP BY prefix
        ORDER BY count DESC`
    )[0].values;

    const labels = result.map(row => row[0]);
    const data = result.map(row => row[1]);

    const backgroundColors = ["#57025f", "rgb(204, 176, 15)"];//generateColors(labels.length);

    new Chart(titlesCtx,
        {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Брой кучета',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

function createDessertNamesChart() {
    console.log("neshto");
    const result = db.exec(`
        SELECT UNICODE_PROPER(name), COUNT(*) as count
        FROM dogs
        WHERE name IS NOT NULL
        AND (
        name LIKE 'Карамел%'
        OR name = 'Карамел'
        OR name LIKE 'Пудинг%'
        OR name LIKE 'Тирамису%'
        OR name LIKE 'Бискит%'
        OR name LIKE 'Шоко%'
        OR name LIKE 'Чоко%'
        OR name LIKE 'Ванила%'
        OR name LIKE 'Ванилия%'
        OR name LIKE 'Брауни%'
        OR name LIKE 'Айс Крийм%'
        OR name LIKE 'Фереро%'
        )
        GROUP BY UNICODE_PROPER(name)
        ORDER BY count DESC
    `)[0].values;

    console.log(result);
    const labels = result.map(row => row[0]);
    const data = result.map(row => row[1]);

    const backgroundColors = ["#fd82ed", "#7bcef8", "#fdf03c"]//generateColors(labels.length);

    new Chart(dessertCtx,
        {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Брой кучета',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

function createAnimalNamesChart() {
    const result = db.exec(`
        SELECT UNICODE_PROPER(name), COUNT(*) as count
        FROM dogs
        WHERE name IS NOT NULL
        AND (
        name LIKE '%Беър%'
        OR name = 'Беър'
        OR name LIKE 'Вълк%'
        OR name LIKE 'Вълчо%'
        OR name LIKE 'Въшка%'
        OR name LIKE 'Мишка%'
        OR name LIKE 'Меч%'
        OR name LIKE 'Коала%'
        OR name LIKE 'Куче'
        OR name LIKE 'Кучо'
        OR name LIKE 'Панда%'
        OR name LIKE 'Панди%'
        OR name LIKE 'Лиси%'
        OR name LIKE 'Тигър%'
        OR name LIKE 'Тигра%'
        OR name LIKE 'Лъв%'
        OR name LIKE 'Пантера%'
        OR name LIKE 'Пума%'
        OR name LIKE 'Кобра%'
        OR name LIKE 'Койот%'
        OR name LIKE 'Зайка%'
        OR name LIKE 'Дракон%'
        OR name LIKE 'Драгон%'
        OR name LIKE 'Мравка%'
        OR name LIKE 'Калинка%'
        )

        GROUP BY UNICODE_PROPER(name)
        ORDER BY count DESC
    `)[0].values;

    // const result = db.exec(`
    //     SELECT FIRST_WORD_PROPER(name) as prefix,
    //     COUNT(*) as count FROM dogs
    //     WHERE name IS NOT NULL AND prefix IN
    //     ('Куче', 'Мечо')
    //     GROUP BY prefix
    //     ORDER BY count DESC

    // `)[0].values;

    const labels = result.map(row => row[0]);
    const data = result.map(row => row[1]);

    const backgroundColors = ["#533030", "#0fc536"]//generateColors(labels.length);

    new Chart(animalCtx,
        {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Брой кучета',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

function createPlantNamesChart() {
    const result = db.exec(`
        SELECT UNICODE_PROPER(name), COUNT(*) as count
        FROM dogs
        WHERE name IS NOT NULL
        AND (
        name LIKE 'Роза%'
        OR name = 'Роза'
        OR name LIKE 'Роуз%'
        OR name LIKE 'Лили%'
        OR name LIKE 'Нарцис%'
        OR name LIKE 'Лимон%'
        OR name LIKE 'Липа%'
        OR name LIKE 'Явор%'
        OR name LIKE 'Мак'
        OR name LIKE 'Шипка%'
        OR name LIKE 'Боровин%'
        OR name LIKE 'Ирис%'
        OR name LIKE 'Далия%'
        OR name LIKE 'Черешка%'
        OR name LIKE 'Чери%'
        OR name LIKE '% босилек%'
        OR name LIKE 'Лайка%'
        OR name LIKE 'Роузмери%'
        OR name LIKE 'Сакура%'
        )
        GROUP BY UNICODE_PROPER(name)
        ORDER BY count DESC
    `)[0].values;

    const labels = result.map(row => row[0]);
    const data = result.map(row => row[1]);

    const backgroundColors = ["#f9bb5f", "#1cf178", "#fd5c3c"]//generateColors(labels.length);

    new Chart(plantCtx,
        {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Брой кучета',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}