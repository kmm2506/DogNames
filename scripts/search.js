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

    statement = db.prepare(`SELECT * FROM dogs
        WHERE UNICODE_LOWER(name) LIKE ? || '%'
        AND municipality LIKE ?
        AND UNICODE_LOWER(address) LIKE '%' || ? || '%'
        AND UNICODE_LOWER(breed) LIKE ? || '%'
        AND (gender LIKE ? OR gender IS NULL)
        AND UNICODE_LOWER(owner) LIKE ? || '%'
        ORDER BY name LIMIT 100`);
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
    const name = document.getElementById("searchInput").value.toLocaleLowerCase('bg-BG');
    const municipality = document.getElementById("municipalitySelect").value;
    const address = document.getElementById("addressInput").value.toLocaleLowerCase('bg-BG');
    const date = document.getElementById("dateInput").value;
    const breed = document.getElementById("breedInput").value.toLocaleLowerCase('bg-BG');
    const gender = document.getElementById("genderSelect").value;
    const owner = document.getElementById("ownerInput").value.toLocaleLowerCase('bg-BG');

    statement.reset();
    statement.bind([name, municipality, address, breed, gender, owner]);
    const result = [];

    while (statement.step()) {
        result.push(statement.get());
    }
    show(result);
}

let db;
let statement;
loadDatabase();