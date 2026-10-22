import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'atm-secure-key-12345')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///atm.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SERIAL_PORT = os.environ.get('SERIAL_PORT', 'COM7')
    BAUD_RATE = 9600