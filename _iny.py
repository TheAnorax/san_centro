import time
import schedule
import requests
import mysql.connector
import datetime
import json

def surtido():
    print("Inicia Sincronización Surtido " + time.strftime("%D %T"))
    url = "http://santul.verpedidos.com:9010/Santul/Surtido"
    continua = 1
    conexion = mysql.connector.connect(
        host="66.232.105.107",
        user="root",
        password="Santul2025",
        database="san_centro"
    )
    cursor = conexion.cursor()
    try:
        cursor.execute("DELETE FROM tem_surtido;")
        cursor.execute("ALTER TABLE tem_surtido AUTO_INCREMENT = 1;")
    except:
        continua = 0
    if continua == 1:
        try:
            respuesta = requests.post(url, json={"Almacen": "7240"}, timeout=15)
        except requests.exceptions.Timeout:
            continua = 0
        if continua == 1:
            try:
                como_json = respuesta.json()
            except:
                continua = 0
            if continua == 1:
                try:
                    for ord in como_json:
                        cursor.execute(
                            "INSERT INTO tem_surtido(pedido,codigo_pedi,cant_surt,ubicacion,fecha,tipo,um,clave) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                            (
                                ord["NoOrden"],      # antes: ord["orden"]
                                ord["Codigo"],       # antes: ord["codigo"]
                                ord["Cantidad"],     # antes: ord["cantidad"]
                                ord["Ubicacion"],    # antes: ord["ubicacion"]
                                ord["Fecha"],        # antes: ord["fecha"]
                                ord["TpOrden"],      # antes: ord["tipo"]
                                ord["UM"],           # antes: ord["um"]
                                ord.get("Clave", "") # antes: ord.get("clave", "")
                            )
                        )
                except:
                    continua = 0
                if continua == 1:
                    try:
                        # INSERT CORREGIDO: usa tabla y columnas correctas
                        cursor.execute("""
                            INSERT INTO pedidos 
                                (no_orden, tipo, codigo_pedido, clave, cantidad, cant_surtida, 
                                cant_no_enviada, um, registro, unido,
                                _bl, _pz, _pq, _inner, _master)
                            SELECT 
                                T1.pedido AS no_orden,
                                T1.tipo,
                                T1.codigo_pedi AS codigo_pedido,
                                T1.clave,
                                SUM(T1.cant_surt) AS cantidad,
                                0 AS cant_surtida,
                                0 AS cant_no_enviada,
                                T1.um,
                                STR_TO_DATE(T1.fecha, '%Y-%m-%d %H:%i:%s') AS registro,
                                IF(COUNT(*) > 1, 1, 0) AS unido,
                                0 AS _bl,
                                0 AS _pz,
                                0 AS _pq,
                                0 AS _inner,
                                0 AS _master
                            FROM tem_surtido AS T1
                            LEFT JOIN pedidos AS T2
                                ON T1.pedido = T2.no_orden AND T1.tipo = T2.tipo
                            WHERE IFNULL(T2.estado, '') = '' AND IFNULL(T2.no_orden, '') = ''
                            GROUP BY T1.pedido, T1.tipo, T1.codigo_pedi, T1.clave, T1.um, T1.fecha;
                        """)
                        conexion.commit()
                        print("Finaliza Sincronización Surtido " + time.strftime("%D %T"))
                    except Exception as e:
                        print("Falla en ingresar datos en la tabla pedidos: " + str(e))
                else:
                    conexion.commit()
                    print("Falla en ingresar datos en la tabla tem_surtido" + time.strftime("%D %T"))
            else:
                print("Error en el JSON I  " + time.strftime("%D %T"))
        else:
            print("Timed out Sincronización Surtido I" + time.strftime("%D %T"))
    else:
        conexion.commit()
        print("Falla en limpiar la tabla tem_surtido" + time.strftime("%D %T"))

# Programación de horarios igual que ya tienes:
schedule.every().day.at("05:50").do(surtido)

schedule.every().day.at("06:16").do(surtido)
schedule.every().day.at("06:56").do(surtido)

schedule.every().day.at("07:16").do(surtido)
schedule.every().day.at("07:56").do(surtido)

schedule.every().day.at("08:16").do(surtido)
schedule.every().day.at("08:56").do(surtido)

schedule.every().day.at("09:16").do(surtido)
schedule.every().day.at("09:56").do(surtido)

schedule.every().day.at("10:16").do(surtido)
schedule.every().day.at("10:56").do(surtido)

schedule.every().day.at("11:32").do(surtido)
schedule.every().day.at("11:56").do(surtido)

schedule.every().day.at("12:16").do(surtido)
schedule.every().day.at("12:49").do(surtido)

schedule.every().day.at("13:16").do(surtido)
schedule.every().day.at("13:46").do(surtido)

schedule.every().day.at("14:41").do(surtido)
schedule.every().day.at("14:56").do(surtido)

schedule.every().day.at("15:16").do(surtido)
schedule.every().day.at("15:45").do(surtido)

schedule.every().day.at("16:16").do(surtido)
schedule.every().day.at("16:45").do(surtido)

schedule.every().day.at("17:46").do(surtido)
schedule.every().day.at("17:54").do(surtido)

schedule.every().day.at("18:16").do(surtido)
schedule.every().day.at("18:37").do(surtido)

schedule.every().day.at("19:16").do(surtido)
schedule.every().day.at("19:56").do(surtido)

schedule.every().day.at("20:16").do(surtido)

schedule.every().day.at("21:56").do(surtido)

schedule.every().day.at("22:16").do(surtido)

schedule.every().day.at("23:47").do(surtido)

schedule.every().day.at("01:32").do(surtido)

while True:
    schedule.run_pending()
    time.sleep(1)
