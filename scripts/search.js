let db;
const filters = `SELECT * FROM dogs
    WHERE (UNICODE_LOWER(name) LIKE ? || '%' OR name IS NULL)
    AND municipality LIKE ?
    AND (UNICODE_LOWER(address) LIKE '%' || ? || '%' OR address IS NULL)
    AND (strftime('%Y', registration_date) LIKE ? OR registration_date IS NULL)
    AND (strftime('%m', registration_date) LIKE ? OR registration_date IS NULL)
    AND (strftime('%d', registration_date) LIKE ? OR registration_date IS NULL)
    AND (UNICODE_LOWER(breed) LIKE '%' || ? || '%' OR breed IS NULL)
    AND (gender LIKE ? OR gender IS NULL)
    AND (UNICODE_LOWER(owner) LIKE ? || '%' OR owner IS NULL)`;
let nullables;
loadDatabase();

async function loadDatabase() {
    const SQL = await initSqlJs();
    const response = await fetch("data/data.db");
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    db.create_function('UNICODE_LOWER', (str) =>
        str?.toLocaleLowerCase('bg-BG') ?? ''
    );

    show(db.exec("SELECT * FROM dogs WHERE name NOT NULL ORDER BY name LIMIT 100")[0].values);
    const municipalitySelect = document.getElementById("municipalitySelect");
    municipalitySelect.innerHTML = "<option value='%'>Всички общини</option>" +
        db.exec("SELECT DISTINCT municipality FROM dogs ORDER BY municipality")[0].values
            .map(row => `<option value="${row[0]}">${row[0]}</option>`)
            .join("");
}

function show(result) {
    if (result.length > 0) {

        document.getElementById("dogsTable").style.display = "table";
        document.getElementById("dogsTableBody").innerHTML =
            result.map(row =>
                "<tr>" + row.map(v => `<td>${v ?? ""}</td>`).join("") + "</tr>"
            ).join("");
        document.getElementById("noResults").style.display = "none";
    }
    else {
        document.getElementById("dogsTable").style.display = "none";
        document.getElementById("noResults").style.display = "block";
    }
}

function filterTable() {
    const name = document.getElementById("nameInput").value.toLocaleLowerCase('bg-BG');
    const municipality = document.getElementById("municipalitySelect").value;
    const address = document.getElementById("addressInput").value.toLocaleLowerCase('bg-BG');
    const day = document.getElementById("dayInput").value || "%";
    const month = document.getElementById("monthInput").value || "%";
    const year = document.getElementById("yearInput").value || "%";
    const breed = document.getElementById("breedInput").value.toLocaleLowerCase('bg-BG');
    const gender = document.getElementById("genderSelect").value;
    const owner = document.getElementById("ownerInput").value.toLocaleLowerCase('bg-BG');

    const checkboxes = [
        document.getElementById("nullableName"),
        document.getElementById("nullableAddress"),
        document.getElementById("nullableDate"),
        document.getElementById("nullableBreed"),
        document.getElementById("nullableGender"),
        document.getElementById("nullableOwner")
    ];

    const orderby = document.getElementById("orderBy").value;
    const orderDirection = document.getElementById("orderDirection").value;
    const limit = document.getElementById("limitInput").value;

    nullables = "";
    checkboxes.forEach(element => {
        if (!element.checked) {
            nullables += `\nAND ${element.value} IS NOT NULL`;
        }
    });
    const query = filters + nullables + `\nORDER BY UNICODE_LOWER(${orderby}) ${orderDirection} LIMIT ?`;
    const statement = db.prepare(query);
    statement.bind([name, municipality, address, year, month, day, breed, gender, owner, limit]);
    console.log(statement.getSQL(), name, municipality, address, year, month, day, breed, gender, owner, limit);

    const result = [];
    while (statement.step()) {
        result.push(statement.get());
    }
    show(result);
}