
const API_KEY = "652eb2a7a37a4b07b15190956261611";

const form = document.getElementById("searchForm");
const input = document.getElementById("cityInput");
const button = document.getElementById("searchButton");

const message = document.getElementById("message");
const weather = document.getElementById("weather");

let temperatureChart = null;


const suggestions = document.getElementById("suggestions");

let timeoutPesquisa;

// Pesquisa sugestões enquanto digita
input.addEventListener("input", () => {

    clearTimeout(timeoutPesquisa);

    const texto = input.value.trim();

    suggestions.innerHTML = "";
    suggestions.style.display = "none";

    // Só pesquisa com pelo menos 3 caracteres
    if (texto.length < 3) {
        return;
    }

    timeoutPesquisa = setTimeout(async () => {

        try {

            const url = new URL(
                "https://api.weatherapi.com/v1/search.json"
            );

            url.search = new URLSearchParams({
                key: API_KEY,
                q: texto
            }).toString();

            const response = await fetch(url);
            const cidades = await response.json();

            if (!response.ok || cidades.length === 0) {
                return;
            }

            cidades.forEach(cidade => {

                const item = document.createElement("div");

                item.className = "suggestion-item";

                item.textContent =
                    `${cidade.name}, ${cidade.region ? cidade.region + ", " : ""}${cidade.country}`;

                item.addEventListener("click", () => {

                    input.value = cidade.name + ", " + cidade.country;

                    suggestions.innerHTML = "";
                    suggestions.style.display = "none";

                });

                suggestions.appendChild(item);

            });

            suggestions.style.display = "block";

        } catch (error) {

            console.log("Erro ao buscar sugestões:", error);

        }

    }, 350);

});

// Fecha as sugestões ao clicar fora
document.addEventListener("click", (event) => {

    if (!event.target.closest(".input-container")) {

        suggestions.style.display = "none";

    }

});


// Pesquisa da cidade
form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const city = input.value.trim();

    if (!city) {
        showMessage("Digite o nome de uma cidade!", true);
        input.focus();
        return;
    }

    button.disabled = true;
    button.textContent = "Buscando...";

    weather.style.display = "none";

    showMessage("⏳ Buscando informações do clima...");

    try {

        // Consulta a API com previsão de 7 dias
        const url = new URL(
            "https://api.weatherapi.com/v1/forecast.json"
        );

        url.search = new URLSearchParams({
            key: API_KEY,
            q: city,
            days: 7,
            lang: "pt"
        }).toString();

        const response = await fetch(url);
        const data = await response.json();

        // Verifica erros
        if (!response.ok) {

            if (data.error?.code === 1006) {
                throw new Error("Cidade não encontrada!");
            }

            if (
                data.error?.code === 2006 ||
                data.error?.code === 2007
            ) {
                throw new Error("Chave da API inválida!");
            }

            throw new Error(
                data.error?.message || "Erro ao consultar o clima."
            );
        }

        // Informações da cidade
        document.getElementById("cityName").textContent =
            data.location.name;

        document.getElementById("regionName").textContent =
            [
                data.location.region,
                data.location.country
            ].filter(Boolean).join(", ");

        // Temperatura atual
        document.getElementById("temperature").textContent =
            Math.round(data.current.temp_c);

        // Sensação térmica
        document.getElementById("feelsLike").textContent =
            Math.round(data.current.feelslike_c) + " °C";

        // Umidade
        document.getElementById("humidity").textContent =
            data.current.humidity + "%";

        // Vento
        document.getElementById("wind").textContent =
            Math.round(data.current.wind_kph) + " km/h";

        // Condição climática
        document.getElementById("condition").textContent =
            data.current.condition.text;

        // Ícone
        const icon = data.current.condition.icon;

        document.getElementById("weatherIcon").src =
            icon.startsWith("//") ? `https:${icon}` : icon;

        document.getElementById("weatherIcon").alt =
            data.current.condition.text;

        // Última atualização
        document.getElementById("updated").textContent =
            "Atualizado em: " + data.current.last_updated;

        // Previsão dos próximos dias
        mostrarPrevisao(data.forecast.forecastday);

        // Gráfico das 24 horas
        mostrarGrafico(data.forecast.forecastday[0].hour);

        // Mostra os resultados
        weather.style.display = "block";

        if (data.forecast.forecastday.length < 7) {
            showMessage(
                "Clima atualizado! Seu plano da API disponibiliza apenas " +
                data.forecast.forecastday.length + " dias de previsão."
            );
        } else {
            showMessage("");
        }

    } catch (error) {

        showMessage(
            error.message || "Erro ao buscar o clima.",
            true
        );

    } finally {

        button.disabled = false;
        button.textContent = "Buscar clima";

    }

});


// Função para mostrar a previsão dos próximos dias
function mostrarPrevisao(dias) {

    const container = document.getElementById(
        "forecastContainer"
    );

    container.innerHTML = "";

    dias.forEach((dia, index) => {

        const data = new Date(dia.date + "T12:00:00");

        const nomeDia = index === 0
            ? "Hoje"
            : data.toLocaleDateString("pt-BR", {
                weekday: "short"
            });

        const icone = dia.day.condition.icon;

        const card = document.createElement("div");

        card.className = "forecast-card";

        card.innerHTML = `
            <div class="day">${nomeDia}</div>

            <img
                src="${icone.startsWith("//") ? "https:" : ""}${icone}"
                alt="${dia.day.condition.text}"
            >

            <div class="condition">
                ${dia.day.condition.text}
            </div>

            <div>
                <span class="max">
                    ${Math.round(dia.day.maxtemp_c)}°
                </span>

                <span class="min">
                    ${Math.round(dia.day.mintemp_c)}°
                </span>
            </div>
        `;

        container.appendChild(card);

    });

}


// Função para criar o gráfico de temperatura
function mostrarGrafico(horas) {

    const ctx = document.getElementById(
        "temperatureChart"
    );

    // Destrói o gráfico anterior ao pesquisar outra cidade
    if (temperatureChart) {
        temperatureChart.destroy();
    }

    // Horários
    const labels = horas.map(hora => {
        return hora.time.split(" ")[1];
    });

    // Temperaturas
    const temperaturas = horas.map(hora => {
        return hora.temp_c;
    });

    // Cria o gráfico
    temperatureChart = new Chart(ctx, {

        type: "line",

        data: {

            labels: labels,

            datasets: [{

                label: "Temperatura (°C)",

                data: temperaturas,

                borderColor: "#176da6",

                backgroundColor: "rgba(23, 109, 166, 0.15)",

                borderWidth: 3,

                fill: true,

                tension: 0.4,

                pointBackgroundColor: "#176da6",

                pointRadius: 3

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: true
                }

            },

            scales: {

                y: {

                    title: {
                        display: true,
                        text: "Temperatura (°C)"
                    }

                },

                x: {

                    title: {
                        display: true,
                        text: "Horários do dia"
                    },

                    ticks: {
                        maxTicksLimit: 8
                    }

                }

            }

        }

    });

}


// Função para mostrar mensagens
function showMessage(text, isError = false) {

    message.textContent = text;

    message.className = isError
        ? "message error"
        : "message";

}
