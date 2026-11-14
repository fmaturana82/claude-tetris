#!/usr/bin/env python3
"""Consulta el clima actual (y opcionalmente el pronóstico) usando Open-Meteo.

Uso:
    python3 clima.py                       # Rancagua, Chile
    python3 clima.py "Santiago, Chile"
    python3 clima.py Valparaíso --pronostico
"""
import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

CIUDAD_POR_DEFECTO = "Rancagua, Chile"
TIMEOUT = 10

WMO = {
    0: ("☀️", "Despejado"),
    1: ("🌤️", "Mayormente despejado"),
    2: ("⛅", "Parcialmente nublado"),
    3: ("☁️", "Nublado"),
    45: ("🌫️", "Niebla"),
    48: ("🌫️", "Niebla con escarcha"),
    51: ("🌦️", "Llovizna ligera"),
    53: ("🌦️", "Llovizna moderada"),
    55: ("🌦️", "Llovizna intensa"),
    56: ("🌧️", "Llovizna helada ligera"),
    57: ("🌧️", "Llovizna helada intensa"),
    61: ("🌧️", "Lluvia ligera"),
    63: ("🌧️", "Lluvia moderada"),
    65: ("🌧️", "Lluvia intensa"),
    66: ("🌧️", "Lluvia helada ligera"),
    67: ("🌧️", "Lluvia helada intensa"),
    71: ("🌨️", "Nevada ligera"),
    73: ("🌨️", "Nevada moderada"),
    75: ("❄️", "Nevada intensa"),
    77: ("🌨️", "Granos de nieve"),
    80: ("🌦️", "Chubascos ligeros"),
    81: ("🌧️", "Chubascos moderados"),
    82: ("⛈️", "Chubascos violentos"),
    85: ("🌨️", "Chubascos de nieve ligeros"),
    86: ("❄️", "Chubascos de nieve intensos"),
    95: ("⛈️", "Tormenta"),
    96: ("⛈️", "Tormenta con granizo ligero"),
    99: ("⛈️", "Tormenta con granizo fuerte"),
}

DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]


def error(msg):
    print(f"❌ {msg}", file=sys.stderr)
    sys.exit(1)


def get_json(url, params):
    full = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full, headers={"User-Agent": "clima-skill/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        error(f"El servicio de clima respondió con error {e.code}.")
    except (urllib.error.URLError, TimeoutError, OSError):
        error("No se pudo conectar con Open-Meteo. Revisa tu conexión a internet.")


def geocodificar(consulta):
    partes = [p.strip() for p in consulta.split(",") if p.strip()]
    if not partes:
        error("Indica el nombre de una ciudad.")
    nombre, filtro = partes[0], (partes[-1].lower() if len(partes) > 1 else None)
    data = get_json(
        "https://geocoding-api.open-meteo.com/v1/search",
        {"name": nombre, "count": 10, "language": "es", "format": "json"},
    )
    resultados = data.get("results") or []
    if filtro:
        filtrados = [
            r for r in resultados
            if filtro in (r.get("country") or "").lower()
            or filtro in (r.get("admin1") or "").lower()
            or filtro == (r.get("country_code") or "").lower()
        ]
        resultados = filtrados or resultados
    if not resultados:
        error(f"No encontré la ciudad «{consulta}».")
    return resultados[0]


def describir(codigo):
    return WMO.get(codigo, ("🌡️", f"Código WMO {codigo}"))


def main():
    p = argparse.ArgumentParser(description="Clima actual vía Open-Meteo")
    p.add_argument("ciudad", nargs="*", help="Ciudad (por defecto: Rancagua, Chile)")
    p.add_argument("--pronostico", action="store_true", help="Agrega pronóstico de 3 días")
    args = p.parse_args()

    consulta = " ".join(args.ciudad) or CIUDAD_POR_DEFECTO
    lugar = geocodificar(consulta)

    params = {
        "latitude": lugar["latitude"],
        "longitude": lugar["longitude"],
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
        "timezone": "auto",
    }
    if args.pronostico:
        params["daily"] = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
        params["forecast_days"] = 4

    data = get_json("https://api.open-meteo.com/v1/forecast", params)
    c = data.get("current")
    if not c:
        error("Respuesta inesperada del servicio de clima.")

    emoji, estado = describir(c["weather_code"])
    hora = c["time"].split("T")[1]
    nombre = ", ".join(x for x in (lugar.get("name"), lugar.get("country")) if x)
    print(
        f"{emoji} {nombre} ({hora}) — {c['temperature_2m']} °C "
        f"(sensación {c['apparent_temperature']} °C) · {estado} · "
        f"Humedad {c['relative_humidity_2m']}% · Viento {c['wind_speed_10m']} km/h"
    )

    if args.pronostico and data.get("daily"):
        import datetime
        d = data["daily"]
        for i in range(1, len(d["time"])):
            fecha = datetime.date.fromisoformat(d["time"][i])
            e, est = describir(d["weather_code"][i])
            lluvia = d["precipitation_probability_max"][i]
            lluvia_txt = f" · Lluvia {lluvia}%" if lluvia is not None else ""
            print(
                f"  {DIAS[fecha.weekday()]} {fecha.day:02d}/{fecha.month:02d}: {e} {est} · "
                f"{d['temperature_2m_min'][i]}–{d['temperature_2m_max'][i]} °C{lluvia_txt}"
            )


if __name__ == "__main__":
    main()
