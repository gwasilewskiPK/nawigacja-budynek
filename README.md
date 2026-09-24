# PK Navigator — A, B, C

Prototyp nawigacji do drzwi na 18 oryginalnych planach PNG V3. Budynek B łączy A i C na poziomach −1, 0 i 1. Inne budynki usunięto z aplikacji i paczki.

## Uruchomienie

Wymagany Node.js. W folderze aplikacji uruchom `npm start`, następnie otwórz http://127.0.0.1:4173/. Do uruchomienia nie trzeba instalować bibliotek. Folder `dist` można udostępnić przez serwer HTTP. Moduły nie działają przez zwykłe otwarcie index.html jako file://.

## Nawigacja

Wybierz start, potem salę docelową. Start przy sali oznacza stanie przed jej drzwiami, twarzą do sali. Każda zmiana kierunku ma osobny krok: prosto, lewo, prawo, łagodny skręt lub obrót o 180°. Kąt jest liczony względem dotychczasowego kierunku marszu. Zmiana budynku korzysta z orientacji wejścia na nowym planie, a nie z kąta między różnymi rysunkami.

Niebieska gruba linia przedstawia bieżący krok; jaśniejsza linia — dalszy przebieg na tym poziomie. Jej grubość na ekranie pozostaje stała podczas powiększania. Złoty punkt oznacza koniec kroku. Strzałka przy starcie pokazuje orientację przed wykonaniem polecenia. Mapa obsługuje przesuwanie i powiększanie. Przyciskiem potwierdzaj dotarcie do kolejnych punktów; prototyp nie śledzi pozycji automatycznie. Pełną instrukcję można rozwinąć, a polecenia odsłuchać polskim głosem przeglądarki.

## Dane

- `scripts/build-network.mjs`: ręcznie naniesione punkty korytarzy, drzwi, schodów i łączników, z orientacją drzwi.
- `dist/network-data.js`: 18 map, 362 pozycje, 955 punktów, 984 połączenia (951 pieszych).
- `dist/routing.js`: wyszukiwanie wyłącznie po zapisanych połączeniach i instrukcje dla wszystkich zakrętów. Brak trasy nie powoduje wyrysowania linii prostej.
- `dist/app.js`: interfejs, mapa SVG, instrukcje, ulubione i eksport danych.
- `dist/public/maps/v3`: 18 nowych obrazów, bez modyfikacji oryginałów.

Współrzędne odnoszą się do widoku 1888 × 1334. Obrazy mają 2000 × 1414 i są proporcjonalnie skalowane. W informacjach aplikacji można pobrać sieć jako JSON. Dowolne przesuwanie punktów w interfejsie wyłączono, aby nie tworzyć niezweryfikowanych przejść.

## Rozbieżności źródłowe

Nie wyznaczamy trasy do B 06-1, C 011-1, C 206, C 405 i C 504: brak potwierdzonego wejścia na rysunku. Na II piętrze C plan powtarza numer 201; biuro pozostaje oznaczone „202 (na planie: 201)” z widoczną uwagą. Na piętro 5 w C prowadzą schody; nie założono wejścia do windy przez maszynownię.

## Weryfikacja

`npm test` sprawdza osiągalność wszystkich dostępnych drzwi, przejścia przez B, dojścia do pokoi wewnętrznych, brak połączeń przez różne plany, kierunki skrętów, orientację startową i zachowanie każdej zmiany kierunku. Sprawdza też przecięcia z liniami ścian wyodrębnionymi z planów.

`scripts/validate-walls.py` (Pillow i numpy) ponownie analizuje obrazy i zapisuje podglądy kontroli w work/qa. Wykluczenia dotyczą wyłącznie nadrukowanych opisów i strzałek, nie ścian. Test rastrowy wspomaga kontrolę wizualną; cienkie lub niejednoznaczne elementy planu wymagają interpretacji. Nie podajemy metrów, ponieważ plany nie mają skalibrowanej skali. Dane sprawdzono na rysunkach, nie w terenie.

Integracja: `window.PKNavigator.setCurrentLocation('A:110')` ustawia start przed drzwiami sali; `'entrance'` ustawia główne wejście w B. Wybór i ulubione są zapisywane lokalnie w przeglądarce.
