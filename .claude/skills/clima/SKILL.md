---
name: clima
description: Consulta el clima actual y el pronóstico de 3 días de cualquier ciudad usando Open-Meteo (gratis, sin API key). Por defecto usa Rancagua, Chile. Úsala cuando el usuario pregunte por el clima, la temperatura, el tiempo en una ciudad, si va a llover o hará frío/calor, o invoque /clima.
---

# Clima

Consulta el clima con el script incluido. No necesita API key ni dependencias, solo `python3`.

## Uso

```bash
python3 .claude/skills/clima/scripts/clima.py                          # Rancagua, Chile (por defecto)
python3 .claude/skills/clima/scripts/clima.py "Santiago, Chile"        # otra ciudad ("ciudad, país" desambigua)
python3 .claude/skills/clima/scripts/clima.py Valparaíso --pronostico  # actual + próximos 3 días
```

## Instrucciones

1. Si el usuario no menciona ciudad, ejecuta el script sin argumentos (Rancagua, Chile).
2. Si menciona una ciudad, pásala como argumento; agrega el país si el nombre es ambiguo.
3. Agrega `--pronostico` si pregunta por mañana, los próximos días, o si va a llover.
4. Muestra la salida tal cual (ya viene en español con emoji). Si el script falla, comunica el mensaje de error.
5. Para monitoreo periódico, sugiere `/loop 15m /clima`: Open-Meteo actualiza los datos "actuales" cada 15 minutos, así que intervalos más cortos repiten valores.
