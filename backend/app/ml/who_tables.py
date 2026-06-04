"""
Tablas de referencia OMS 2006 — Estándares de crecimiento infantil.
Indicador: Peso para la Edad (WAZ), 0–60 meses.

Fuente: WHO (2006). WHO Child Growth Standards: Methods and development.
        wfa_boys_0_5_zscores.txt / wfa_girls_0_5_zscores.txt

Fórmula LMS:  Z = ((X/M)^L − 1) / (L · S)
  donde L = parámetro de potencia Box-Cox
        M = mediana de referencia (kg)
        S = coeficiente de variación generalizado

Para |Z| > 3 se aplica la corrección lineal de la OMS para evitar
distorsión en los extremos de la distribución.
"""

from __future__ import annotations
import math


# ─── Niños (M) — L constante = −0.3521 ────────────────────────────────────────

_WFA_BOYS_L: float = -0.3521

_WFA_BOYS_M = [
    # Meses 0–9
    3.3464, 4.4709, 5.5675, 6.3762, 7.0023, 7.5105, 7.9340, 8.2970, 8.6151, 8.9014,
    # Meses 10–19
    9.1649, 9.4122, 9.6479, 9.8749, 10.0953, 10.3108, 10.5228, 10.7319, 10.9385, 11.1430,
    # Meses 20–29
    11.3462, 11.5486, 11.7504, 11.9514, 12.1515, 12.3514, 12.5502, 12.7489, 12.9470, 13.1445,
    # Meses 30–39
    13.3415, 13.5381, 13.7341, 13.9296, 14.1244, 14.3187, 14.5125, 14.7058, 14.8987, 15.0912,
    # Meses 40–49
    15.2833, 15.4751, 15.6666, 15.8580, 16.0491, 16.2402, 16.4313, 16.6224, 16.8135, 17.0046,
    # Meses 50–60
    17.1959, 17.3874, 17.5792, 17.7713, 17.9638, 18.1568, 18.3503, 18.5443, 18.7389, 18.9340,
    19.1296,
]

_WFA_BOYS_S = [
    # Meses 0–9
    0.14602, 0.13395, 0.12385, 0.11727, 0.11316, 0.10963, 0.10680, 0.10477, 0.10322, 0.10218,
    # Meses 10–19
    0.10138, 0.10054, 0.09960, 0.09876, 0.09797, 0.09724, 0.09658, 0.09596, 0.09540, 0.09490,
    # Meses 20–29
    0.09441, 0.09397, 0.09354, 0.09317, 0.09283, 0.09256, 0.09230, 0.09211, 0.09192, 0.09179,
    # Meses 30–39
    0.09166, 0.09158, 0.09152, 0.09149, 0.09148, 0.09149, 0.09152, 0.09158, 0.09166, 0.09176,
    # Meses 40–49
    0.09188, 0.09203, 0.09219, 0.09238, 0.09259, 0.09281, 0.09306, 0.09332, 0.09360, 0.09389,
    # Meses 50–60
    0.09421, 0.09454, 0.09489, 0.09525, 0.09562, 0.09602, 0.09642, 0.09685, 0.09728, 0.09773,
    0.09819,
]


# ─── Niñas (F) — L constante = −0.0631 ───────────────────────────────────────

_WFA_GIRLS_L: float = -0.0631

_WFA_GIRLS_M = [
    # Meses 0–9
    3.2322, 4.1875, 5.1282, 5.8482, 6.4237, 6.8745, 7.2676, 7.6498, 7.9551, 8.2040,
    # Meses 10–19
    8.4502, 8.6896, 8.9481, 9.1760, 9.3961, 9.6127, 9.8273, 10.0380, 10.2450, 10.4488,
    # Meses 20–29
    10.6494, 10.8470, 11.0419, 11.2344, 11.4994, 11.6937, 11.8877, 12.0814, 12.2749, 12.4681,
    # Meses 30–39
    12.6611, 12.8538, 13.0465, 13.2390, 13.4314, 13.6238, 13.8161, 14.0083, 14.2004, 14.3924,
    # Meses 40–49
    14.5843, 14.7762, 14.9681, 15.1601, 15.3522, 15.5444, 15.7368, 15.9295, 16.1224, 16.3156,
    # Meses 50–60
    16.5092, 16.7031, 16.8973, 17.0919, 17.2869, 17.4822, 17.6780, 17.8741, 18.0707, 18.2677,
    18.4652,
]

_WFA_GIRLS_S = [
    # Meses 0–9
    0.14171, 0.13724, 0.13000, 0.12435, 0.12066, 0.11826, 0.11647, 0.11482, 0.11317, 0.11146,
    # Meses 10–19
    0.10986, 0.10918, 0.10928, 0.10906, 0.10924, 0.10958, 0.11001, 0.11047, 0.11097, 0.11141,
    # Meses 20–29
    0.11186, 0.11232, 0.11278, 0.11323, 0.11366, 0.11406, 0.11443, 0.11476, 0.11506, 0.11533,
    # Meses 30–39
    0.11556, 0.11577, 0.11594, 0.11609, 0.11621, 0.11631, 0.11638, 0.11644, 0.11648, 0.11651,
    # Meses 40–49
    0.11652, 0.11652, 0.11652, 0.11651, 0.11650, 0.11648, 0.11646, 0.11644, 0.11642, 0.11640,
    # Meses 50–60
    0.11638, 0.11636, 0.11634, 0.11633, 0.11633, 0.11634, 0.11636, 0.11639, 0.11643, 0.11649,
    0.11655,
]


# ─── Cálculo Z-score ──────────────────────────────────────────────────────────

def calcular_zscore_who(peso: float, edad_meses: int, sexo: str) -> float | None:
    """
    Z-score Peso/Edad (WAZ) usando tablas LMS OMS 2006.

    Aplica la corrección lineal de la OMS para |Z| > 3 según:
    WHO (2006). Multicentre Growth Reference Study Group.
    Acta Paediatrica, Suppl 450, pp. 76–85.

    Returns:
        float redondeado a 2 decimales, o None si los datos no son válidos.
    """
    if not peso or peso <= 0 or edad_meses is None or not (0 <= int(edad_meses) <= 60):
        return None

    mes = int(edad_meses)

    if sexo == 'M':
        L = _WFA_BOYS_L
        M = _WFA_BOYS_M[mes]
        S = _WFA_BOYS_S[mes]
    else:
        L = _WFA_GIRLS_L
        M = _WFA_GIRLS_M[mes]
        S = _WFA_GIRLS_S[mes]

    # Fórmula LMS
    if abs(L) < 1e-6:
        z = math.log(peso / M) / S
    else:
        z = ((peso / M) ** L - 1.0) / (L * S)

    # Corrección OMS para valores extremos (|Z| > 3)
    if z > 3.0:
        sd3p = M * (1.0 + L * S * 3.0) ** (1.0 / L)
        sd2p = M * (1.0 + L * S * 2.0) ** (1.0 / L)
        dif = sd3p - sd2p
        if dif > 0:
            z = 3.0 + (peso - sd3p) / dif
    elif z < -3.0:
        sd3n = M * (1.0 + L * S * (-3.0)) ** (1.0 / L)
        sd2n = M * (1.0 + L * S * (-2.0)) ** (1.0 / L)
        dif = sd2n - sd3n
        if dif > 0:
            z = -3.0 - (sd3n - peso) / dif

    return round(float(z), 2)


# ─── Clasificación MUAC ───────────────────────────────────────────────────────

def clasificar_muac(per_braqui: float | None, edad_meses: int) -> str | None:
    """
    Clasificación por perímetro braquial (MUAC) según OMS para niños 6–59 meses.

        < 11.5 cm  → SAM  (Desnutrición aguda severa)
        11.5–12.4 cm → MAM (Desnutrición aguda moderada)
        ≥ 12.5 cm  → Normal

    Returns None si no hay dato o el niño está fuera del rango etario.
    """
    if per_braqui is None or per_braqui <= 0:
        return None
    if not (6 <= edad_meses <= 59):
        return None

    if per_braqui < 11.5:
        return 'SAM'
    if per_braqui < 12.5:
        return 'MAM'
    return 'Normal'
