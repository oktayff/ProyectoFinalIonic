import { AngularFireAuth } from '@angular/fire/auth';

import { Component, ViewChild, ElementRef } from '@angular/core';

import { Plugins } from '@capacitor/core';
import { Observable } from 'rxjs';
import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore';
const { Geolocation } = Plugins;

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  locations: Observable<any>;
  locationsCollection: AngularFirestoreCollection<any>;
  user = null;

  @ViewChild('map', { static: true }) mapElement: ElementRef;
  map: any;
  markers = [];

  isTracking = false;
  watch = null;

  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.anonymousLogin();
  }

  ionViewWillEnter() {
    this.loadMap();
  }

  loadMap() {
    // tslint:disable-next-line: prefer-const
    let latLng = new google.maps.LatLng(37.5539408, -5.8818169);


    // tslint:disable-next-line: prefer-const
    let mapOptions = {
        center: latLng,
        zoom: 5,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

}

// Usamos el login anónimo de Firebase
anonymousLogin() {
    this.afAuth.auth.signInAnonymously().then(res => {
      this.user = res.user;
      console.log(this.user);

      this.locationsCollection = this.afs.collection(
        `locations/${this.user.uid}/track`,
        ref => ref.orderBy('timestamp')
      );

      // Cargamos los datos de Firebase
      this.locations = this.locationsCollection.valueChanges();

      this.locations.subscribe(locations => {
        this.updateMap(locations);
        });
    });
  }

  // Actualizamos el mapa pasandole una nueva localización
  updateMap(locations) {
    this.markers.map(marker => marker.setMap(null));
    this.markers = [];

    /* Recorremos la lista de localizaciones y añadimos la
    longitud y latitud en la que nos encontramos */

    for (let loc of locations) {
      let latLng = new google.maps.LatLng(loc.lat, loc.lng);

      // Añadimos el marker en el array de markers
      let marker = new google.maps.Marker({
        position: latLng,
        animation: google.maps.Animation.DROP, // Animación de drop para la localización
        map: this.map
      });
      this.markers.push(marker);
    }
  }

  /* Cuando se ejecuta este método, el navegador nos pide permisos para
  poder acceder a nuestra posición y almacena esos datos para
  determinar la localización */
  startTracking() {
    this.isTracking = true;
    this.watch = Geolocation.watchPosition({}, (position, err) => {
      console.log('new position', position);
      if (position) {
        this.addNewLocation(position.coords.latitude, position.coords.longitude, position.timestamp
        );
      }
    });
  }

  /* Cuando se ejecuta este método, el navegador deja de rastrear nuestra
  ubicación */
  stopTracking() {
    Geolocation.clearWatch({ id: this.watch }).then(() => {
      this.isTracking = false;
    });
  }

  /* Método que añade nuestra localización a la colleción que tenemos
  creada con los datos de la latitud, longitud y la marca del tiempo */
  addNewLocation(lat, lng, timestamp) {
    this.locationsCollection.add({
      lat,
      lng,
      timestamp
    });

    const position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(5);
  }
}
