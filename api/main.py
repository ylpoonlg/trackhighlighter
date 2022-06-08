import flask
from flask import Flask, request, render_template, send_from_directory
import os
import requests

DEPLOY_LOCATION = "/trackhighlighter"

app = Flask(__name__)

@app.route(DEPLOY_LOCATION + '/static/<path:path>', methods = ['GET'])
def serve_static_files(path):
    return send_from_directory('static', path)

@app.route(DEPLOY_LOCATION + '/cloud', methods = ['GET'])
def cloud_page():
    return render_template("cloud.html")

@app.route(DEPLOY_LOCATION + '/', methods = ['GET'])
def home_page():
    return render_template("index.html")



# API
@app.route(DEPLOY_LOCATION + '/api/tile/<s>/<z>/<x>/<y>', methods = ['GET'])
def get_tile_url(s,z,x,y):
    url = f'http://{s}.tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png'
    if url == None:
        return "No url found"
    img = requests.get(url)
    response = flask.make_response(img.content) 
    response.headers['Content-Type'] = 'image/png'
    return response

@app.route(DEPLOY_LOCATION + '/api/savecloud', methods = ['POST'])
def save_cloud():
    data = request.get_json()
    if data == None:
        return {
            "status": "nodata"
        }

    passphrase = data['passphrase']
    lines = data['lines']

    try:
        check_data_dir()
        file = open(f'../data/{passphrase}.txt', "wt")
        file.write(lines)
        file.close()
        return {
            "status": "success",
        }
    except:
        return {
            "status": "fileerror"
        }

@app.route(DEPLOY_LOCATION + '/api/loadcloud', methods = ['GET'])
def load_cloud():
    passphrase = request.args.get('passphrase')
    if passphrase == None:
        return {"status": "nodata"}

    try:
        check_data_dir()
        file = open(f'../data/{passphrase}.txt', "rt")
        lines = file.read()
        file.close()
    except:
        return {
            "status": "nofilefound"
        }

    return {
        "status": "success",
        "lines": lines,
    }


def check_data_dir():
    if not os.path.exists('../data'):
        os.makedirs('../data');


if __name__ == '__main__':
   app.run(debug=True, host="127.0.0.1", port=8964)
