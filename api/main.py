import flask
from flask import Flask, request, render_template
import requests

DEPLOY_LOCATION = "/trackhighlighter"

app = Flask(__name__)

@app.route(DEPLOY_LOCATION + '/api/tile/<s>/<z>/<x>/<y>')
def get_tile_url(s,z,x,y):
    url = f'http://{s}.tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png'
    if url == None:
        return "No url found"
    img = requests.get(url)
    response = flask.make_response(img.content) 
    response.headers['Content-Type'] = 'image/png'
    return response


@app.route(DEPLOY_LOCATION + '/test')
def test_page():
    return render_template("test.html")

@app.route(DEPLOY_LOCATION + '/')
def home_page():
    return render_template("index.html")

if __name__ == '__main__':
   app.run(debug=True)
