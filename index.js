let db;

async function loadDatabase() {
    const SQL = await initSqlJs();
    const response = await fetch("data/data.db");
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    query("SELECT * FROM dogs WHERE name NOT NULL ORDER BY name LIMIT 100");
}

function query(statement) {
    const result = db.exec(statement);

    if (result.length > 0) {
        const columns = result[0].columns;
        const rows = result[0].values;

        document.querySelector("#dogsTable thead").innerHTML =
            "<tr>" + columns.map(c => `<th>${c}</th>`).join("") + "</tr>";

        document.querySelector("#dogsTable tbody").innerHTML =
            rows.map(row =>
                "<tr>" + row.map(v => `<td>${v ?? ""}</td>`).join("") + "</tr>"
            ).join("");
        document.querySelector("#noResults").style.display = "none";
    }
    else {
        document.querySelector("#dogsTable thead").innerHTML = "";
        document.querySelector("#dogsTable tbody").innerHTML = "";
        document.querySelector("#noResults").style.display = "block";
    }
}

function filterTable() {
    const input = document.getElementById("searchInput");
    query(`SELECT * FROM dogs WHERE name LIKE '${input.value}%' ORDER BY name LIMIT 100`);
}

loadDatabase();