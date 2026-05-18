from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/datasources/<path:filename>")
def datasource(filename):
    return send_from_directory("datasources", filename)

@app.route("/pictures/<path:filename>")
def picture(filename):
    return send_from_directory("pictures", filename)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
