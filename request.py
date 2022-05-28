import requests
import json

r = requests.post("http://localhost:8002/users/login",
    json={'username':'pedro','password':'333'}) #estamos a mandar isto no body do post

token = r.json()['token']
print(token)

#Cria tarefa
requests.post("http://localhost:8001/tarefas?token=" + token,
json = {"designacao":"consulta",
        "data":"2022",
        "responsavel":"pedro"})

#Também funciona assim

#requests.post("http://localhost:8001/tarefas",
#json = {"designacao":"consulta",
#        "data":"2022",
#        "responsavel":"pedro",
#        "token":token})


#lista tarefas
r = requests.get("http://localhost:8001/tarefas?token=" +token)
#r = requests.get("http://localhost:8001/tarefas", params= {"token": token})
print(r.json())

