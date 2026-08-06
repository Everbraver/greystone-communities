// Code to run when page finishes loading
//
// The Google Maps API is loaded from the Webflow page with `async defer`, so
// `google.maps` is NOT guaranteed to exist when Finsweet's cmsload callback fires.
// On a cold cache the Maps API lands ~1s AFTER cmsload, and the map init throws
// `ReferenceError: google is not defined` — which is why the page needed reloading
// twice to show a map. Gate init on BOTH signals instead of just cmsload.
//
// Requires `&loading=async&callback=__initMap` on the Maps API script tag in Webflow,
// preceded in the SAME head block by the shim that creates window.__mapsReady:
//
//   <script>window.__mapsReady = new Promise(r => { window.__initMap = r; });</script>
//
// The shim must sit in the head because this file is deferred in the footer: on a warm
// cache the Maps API can finish and call __initMap BEFORE this file has parsed, which
// would log "__initMap is not a function". Preferring the head-created promise removes
// that ordering assumption. The inline fallback keeps this file working on its own if
// the shim is ever lost.
const googleMapsReady =
  window.__mapsReady ||
  new Promise((resolve) => {
    if (window.google && window.google.maps) return resolve();
    window.__initMap = resolve;
  });

window.fsAttributes = window.fsAttributes || [];
window.fsAttributes.push([
  "cmsload",
  async (listInstances) => {
    // Load Map once the locations have finished rendering AND the Maps API is ready
    await googleMapsReady;
    loadMap();
  },
]);

// data-selection

const loadMap = function () {
  setTimeout(function () {
    // Initiate array to set locations
    var locations = [];

    // Query all elements in the CMS
    var dynPlaces = document.querySelectorAll(".location");
    let dynPlacesSet = new Set();

    // Loop through CMS items to populate locations array
    function setPlaces() {
      dynPlaces.forEach(function (elem) {
        // Set an object to add to locations array
        var place = {};
        place.filters = {};

        //Query for all data to be added to location object
        place.image = elem.querySelector(".location-image").src;
        place.name = elem.querySelector(".location-name").innerText;
        place.city = elem.querySelector(".location-city").innerText;
        place.description = elem.querySelector(
          ".location-description",
        ).innerHTML;
        place.lat = Number(elem.querySelector(".location-latitude").innerText);
        place.long = Number(
          elem.querySelector(".location-longitude").innerText,
        );
        place.region = elem.querySelector(".location-region").innerText;

        
        //add management
        place.management = [];
        const tempManagement = [...elem.querySelectorAll(".location-management")];
        tempManagement.forEach((management) => {
          place.management.push(management.innerText)
        })
        

        place.numberOfServices = 0;

        //add status
        const tempStatus = [...elem.querySelectorAll(".location-status")];
        place.status = [];
        tempStatus.forEach((status) => {
          place.status.push(status.innerText);
        });
        // place.status = elem.querySelector(".location-status").innerText;
        // place.organisationalType = elem.querySelector(
        //   ".location-organisational-type",
        // ).innerText;
        // place.dateOpened = elem.querySelector(
        //   ".location-date-opened",
        // ).innerText;
        place.ctaLink = elem
          .querySelector(".location-link")
          .getAttribute("href");

        //Loop through services
        var services = elem.querySelectorAll(".location-service");

        services.forEach(function (serv) {
          place.service.push(serv.innerText);
          place.numberOfServices++;
        });
        //Add location to locations array
        locations.push(place);
        dynPlacesSet.add(place);
      });

      locations = [];
      locations = [...dynPlacesSet];
    }

    setPlaces();

    // Generate google map
    var map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 37.5377078, lng: -100.2053964 },
      zoom: 4,
      mapId: "7ff477d0469bb117",
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // Create info window for each marker
    var infowindow = new google.maps.InfoWindow();

    // Define function to create a marker
    function createMarker(location, html) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(location.lat, location.long),
        map: map,
        icon: "https://uploads-ssl.webflow.com/611594476490a4775f74909e/65490b68ad61feab01f07153_Marker.svg",
        region: location.region,
        service: location.service,
        management: location.management,
        // numberOfServices: location.numberOfServices,
        // servicesUnchecked: location.numberOfServices,
        status: location.status,
        // organisationalType: location.organisationalType,
        // dateOpened: location.dateOpened,
        name: location.name,
        description: location.description,
        // regionIsSet: true,
        // serviceIsSet: true,
        // statusIsSet: true,
        // organisationalTypeIsSet: true,
        // dateOpenedIsSet: true,
      });

      // Adding info window to each marker
      google.maps.event.addListener(marker, "click", function (e) {
        // infowindow.setContent(html);
        // infowindow.open(map, marker);
        generatePopup(marker);
      });

      google.maps.event.addListener(map, "click", function (event) {
        infowindow.close();
      });

      return marker;
    }

    // Initiate array to add marker info to be queried later
    gmarkers = [];

    //Loop through all locations to create marker and add them to gmarkers array
    locations.forEach(function (location) {
      var infoWindowHTML = "";
      if (location.ctaLink === "#") {
        infoWindowHTML = `<div class="map-marker--custom">
    <img class="map-marker--thumb" src='${location.image}'>
    
    <div class="map-marker-content">
    <h2 class="map-marker-name">${location.name}</h2>
    <div class="map-marker-description">${location.description}</div>
    </div>
    </div>`;
      } else {
        infoWindowHTML = `<div class="map-marker--custom">
    <img class="map-marker--thumb" src='${location.image}' style="width: 100%">
    <div class="map-marker-content">
    <h2 class="map-marker-name">${location.name}</h2>

    <p class="map-marker-city">${location.city}<p>
    <div class="map-marker-description">${location.description}</div>
    <a href="${location.ctaLink}" class="map-marker-cta">See more</a>
    </div>
    </div>`;
      }

      gmarkers.push(createMarker(location, infoWindowHTML));
    });

    //get geoCodes
    let markerStates = new Set();

    //generate Geocode to get the state and assign it to the gmarkers -- not working
    //assign state
    // function assignStatesToMarkers() {
    //   gmarkers.forEach((marker) => {
    //     const lat = marker.getPosition().lat();
    //     const lng = marker.getPosition().lng();

    //     const geoCoder = new google.maps.Geocoder();
    //     geoCoder.geocode({ location: { lat, lng } }, function (result, status) {
    //       if (status === "OK") {
    //         marker.geocodeInfo = result[0].address_components;
    //         const addressComponents = result[0].address_components;
    //         addressComponents.forEach((addressComponent) => {
    //           if (
    //             addressComponent.types.includes("administrative_area_level_1")
    //           ) {
    //             marker.state = addressComponent.long_name;
    //             markerStates.add(addressComponent.long_name);
    //             setNewPos(addressComponent.long_name, marker);
    //           }
    //         });
    //       } else {
    //         console.log("No result");
    //       }
    //     });
    //   });
    // }

    //set marker pos to state pos once the state pos has been found
    // function setNewPos(state, marker) {
    //   const geoCoder = new google.maps.Geocoder();

    //   geoCoder.geocode({ address: state }, function (result, status) {
    //     if (status === "OK") {
    //       const lat = result[0].geometry.location.lat();
    //       const lng = result[0].geometry.location.lng();

    //       const newPos = new google.maps.LatLng(lat, lng);

    //       marker.setPosition(newPos);
    //       console.log(newPos);
    //     } else {
    //       console.log(state);
    //     }
    //   });
    // }

    // assignStatesToMarkers();

    //generate popups for individual markers
    let markerLocations = [];
    function generatePopup(marker) {
      markerLocations = [];
      markerLocations.push(cloneLocationNode(marker.name));
      showLocationsPopup(markerLocations);
      document.querySelector(".project-card-wrapper").click();

      [".card-expand-overlay", ".expand-close"].forEach((item) => {
        document.querySelector(item).onclick = () => {
          closeLocationsPopup();
        };
      });
    }

    //Create renderer to add custom markers to marker clusterer
    const renderer = {
      render: ({ count, position }) =>
        new google.maps.Marker({
          label: { text: String(count), color: "#153E6D", fontSize: "10px" },
          icon: {
            url: "https://uploads-ssl.webflow.com/611594476490a4775f74909e/65490ac01e5bf40943403408_Dot.svg",
            scaledSize: new google.maps.Size(40, 40),
          },
          position,
          zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
        }),
    };

    //set clustering algorithm
    const markerClusterAlgo = new markerClusterer.SuperClusterAlgorithm({
      maxZoom: 10,
      radius: 50,
    });

    //decaler new marker clusterer
    const markerCluster = new markerClusterer.MarkerClusterer({
      gmarkers,
      map,
      renderer,
      algorithm: markerClusterAlgo,
      onClusterClick: () => {
        //IMPORTANT
        //FOR SOME REASON ADDING THE CLICK HANDLER HERE PREVENTS THE MAP FROM ZOOMING IN
        //BUT IT DOESNT RETURN THE EVENT TARGET
      },
    });

    //SETUP PROJECT CARDS SHOW/HIDE
    let clusterLocations = [];
    const projectCardsPopup = document.querySelector(".project-cards-popup");

    google.maps.event.addListener(markerCluster, "click", function (e) {
      const markers = e.markers;
      let singleMarker;

      let counter = 0;

      //save visible markers into a separate array
      markers.forEach((marker) => {
        //target visible markers in a cluster
        if (marker.visible) {
          counter += 1;
          singleMarker = marker;
          clusterLocations.push(cloneLocationNode(marker.name));
        }
      });

      if (counter === 1) {
        generatePopup(singleMarker);
      } else {
        showLocationsPopup(clusterLocations);
      }
      console.log(counter);
    });

    //show popup with ocations in cluster
    function showLocationsPopup(locations) {
      projectCardsPopup.style.display = "flex";
      projectCardsPopup.querySelector(".project-cards-list").innerHTML = "";
      projectCardsPopup.querySelector(".project-cards-wrapper").scrollTop = 0;

      //generate and append location
      locations.forEach((location) => {
        //generate a card for each location
        var generatedCard = generateCard(location);

        //generate subLocations except for the current location
        //create max of 5 sublocations, no need to query rest of locations
        let subLocations = [];
        if (locations.length > 1) {
          let counter = 0;
          for (let i = 0; i < locations.length; i++) {
            if (i !== locations.indexOf(location)) {
              if (counter >= 5) {
                break;
              }
              subLocations.push([locations[i]]);
              counter++;
            }
          }
        }

        if (subLocations.length > 0) {
          const subLocationCards = generateSublocationCards(subLocations);

          generatedCard
            .querySelector(".card-expand_wrapper")
            .append(subLocationCards);
        }

        //and attach the events
        createCardEvents(generatedCard);

        projectCardsPopup
          .querySelector(".project-cards-list")
          .appendChild(generatedCard);
      });
    }

    //----generate the cards that'll go into the popup modal when you click on a cluster

    //PARSE INFORMATION FROM A CMS LOCATION ELEMENT
    function getLocationObject(locationElement) {
      const img = () => {
        return locationElement
          .querySelector(".location-image")
          .getAttribute("src");
      };

      const name = () => {
        return locationElement.querySelector(".location-name").innerHTML;
      };

      const city = () => {
        return locationElement.querySelector(".location-city").innerHTML;
      };

      const link = () => {
        if (locationElement.querySelector(".location-link")) {
          return locationElement
            .querySelector(".location-link")
            .getAttribute("href");
        } else {
          return "";
        }
      };

      const services = () => {
        if (locationElement.querySelector(".service-description")) {
          let services = [];

          servicesTemp = [
            ...locationElement.querySelectorAll(".service-description"),
          ];

          servicesTemp.forEach((service) => services.push(service.innerText));

          return services;
        } else {
          return [];
        }
      };

      const description = () => {
        if (locationElement.querySelector(".map-wysiwyg")) {
          const description =
            locationElement.querySelector(".map-wysiwyg").innerHTML;

          return description;
        }
      };

      const location = {
        img: img(),
        city: city(),
        name: name(),
        link: link(),
        services: services(),
        description: description(),
      };

      return location;
    }

    //GENERATE SUBLICATION CARDS FOR POPUPS
    function generateSublocationCards(sublocations) {
      const cExpandBottom = document.createElement("div");
      cExpandBottom.classList.add("c-expand_bottom");

      const expandCards = document.createElement("div");
      expandCards.classList.add("c-expand_cards");

      sublocations.forEach((location) => {
        const cExpandCard = document.createElement("div");
        cExpandCard.classList.add("c-expand_card");

        // console.log(location);
        const locationInfo = getLocationObject(location[0]);

        cExpandCard.innerHTML = `
          <div class="c-expand_card-bg">
            <img src="${locationInfo.img}" alt="" class="img-cover" />
            <div class="c-expand_card-overlay"></div>
          </div>
          <div class="c-expand_card-info">
            <span class="c-expand_card-heading">${locationInfo.name}</span>
            <span class="c-expand_card-subheading">${locationInfo.city}</span>
            <a href="#" class="c-expand_card-cta sublocation-cta" data-name="${locationInfo.name}" >LEARN MORE</a>
          </div>
        `;

        expandCards.append(cExpandCard);
      });

      cExpandBottom.innerHTML = `
      <span class="c-expand_subtitle">Suggested nearby</span>
      ${expandCards.outerHTML}
      `;

      return cExpandBottom;
    }

    //GENERATE PROJECT CARDS TO POPULATE POPUP
    function generateCard(locationElement) {
      // console.log(locationElement);
      const location = getLocationObject(locationElement);

      const projectCard = document.createElement("div");
      projectCard.classList.add("project-card");

      projectCard.innerHTML = `
        <a href="#" class="project-card-wrapper">
          <div class="card-image">
            <img src="${location.img}" alt="" class="img-cover">
          </div>
          <div class="card-details">
            <span class="project-name is-smaller">${location.name}</span>
            <span class="project-city">${location.city}</span>
            <span class="project-text is-description">${location.description}</span>
          </div>
        </a>
        <div class="project-card_expand">
          <div class="card-expand-overlay"></div>
          <div class="card-expand_wrapper">
            <a href="#" class="expand-close"><img src="https://uploads-ssl.webflow.com/611594476490a4775f74909e/65490ee7de5a8e81fcd0e30c_Close.svg" alt=""></a>
            <div class="c-expand_top">
              <div class="c-expand_image">
                <img src="${location.img}" alt="" class="img-cover" />
              </div>
              <div class="c-expand_info">
                <div class="c-expand_info-header">
                  <span class="project-name">${location.name}</span>
                  <span class="project-city">${location.city}</span>
                  <span class="project-text is-description">${location.description}</span>
                </div>
                <a href="${location.link}" target="_blank" class="c-expand_cta project-card-link">LEARN MORE</a>
              </div>
            </div>
          </div>
        </div>
      `;

      if (location.link === "#") {
        projectCard.innerHTML = `
        <a href="#" class="project-card-wrapper">
          <div class="card-image">
            <img src="${location.img}" alt="" class="img-cover">
          </div>
          <div class="card-details">
            <span class="project-name is-smaller">${location.name}</span>
            <span class="project-city">${location.city}</span>
            <span class="project-text is-description">${location.description}</span>
          </div>
        </a>
        <div class="project-card_expand">
          <div class="card-expand-overlay"></div>
          <div class="card-expand_wrapper">
            <a href="#" class="expand-close"><img src="https://uploads-ssl.webflow.com/611594476490a4775f74909e/65490ee7de5a8e81fcd0e30c_Close.svg" alt=""></a>
            <div class="c-expand_top">
              <div class="c-expand_image">
                <img src="${location.img}" alt="" class="img-cover" />
              </div>
              <div class="c-expand_info">
                <div class="c-expand_info-header">
                  <span class="project-name">${location.name}</span>
                  <span class="project-city">${location.city}</span>
                  <span class="project-text is-description">${location.description}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      } else {
        projectCard.innerHTML = `
        <a href="#" class="project-card-wrapper">
          <div class="card-image">
            <img src="${location.img}" alt="" class="img-cover">
          </div>
          <div class="card-details">
            <span class="project-name is-smaller">${location.name}</span>
            <span class="project-city">${location.city}</span>
            <span class="project-text is-description">${location.description}</span>
          </div>
        </a>
        <div class="project-card_expand">
          <div class="card-expand-overlay"></div>
          <div class="card-expand_wrapper">
            <a href="#" class="expand-close"><img src="https://uploads-ssl.webflow.com/611594476490a4775f74909e/65490ee7de5a8e81fcd0e30c_Close.svg" alt=""></a>
            <div class="c-expand_top">
              <div class="c-expand_image">
                <img src="${location.img}" alt="" class="img-cover" />
              </div>
              <div class="c-expand_info">
                <div class="c-expand_info-header">
                  <span class="project-name">${location.name}</span>
                  <span class="project-city">${location.city}</span>
                  <div class="project-text is-description">${location.description}</div>
                </div>
                <a href="${location.link}" target="_blank" class="c-expand_cta project-card-link">LEARN MORE</a>
              </div>
            </div>
          </div>
        </div>
      `;
      }

      return projectCard;
    }

    //add click events to the generated card
    function createCardEvents(projectCard) {
      const cardWrapper = projectCard.querySelector(".project-card-wrapper");

      const cardExpand = projectCard.querySelector(".project-card_expand");

      const cardExpandOverlay = projectCard.querySelector(
        ".card-expand-overlay",
      );

      const cardExpandClose = projectCard.querySelector(".expand-close");

      cardWrapper.onclick = () => {
        cardExpand.style.display = "flex";
      };

      //add closing triggers
      [cardExpandOverlay, cardExpandClose].forEach((trigger) => {
        trigger.onclick = () => {
          cardExpand.style.display = "none";
        };
      });

      const subLocationCtas = [
        ...projectCard.querySelectorAll(".sublocation-cta"),
      ];

      subLocationCtas.forEach((subCTA) => {
        subCTA.addEventListener("click", () => {
          showProject(subCTA.dataset.name);
        });
      });
    }

    function showProject(name) {
      gmarkers.forEach((marker) => {
        if (marker.name === name) {
          generatePopup(marker);
        }
      });
    }

    //close and clear popup
    function closeLocationsPopup() {
      projectCardsPopup.style.display = "none";
      projectCardsPopup.querySelector(".project-cards-wrapper").scrollTop = 0;
      projectCardsPopup.querySelector(".project-cards-list").innerHTML = "";
      clusterLocations = [];
    }

    function cloneLocationNode(name) {
      let clonedNode;

      dynPlaces.forEach(function (place) {
        if (place.dataset.name === name) {
          clonedNode = place.cloneNode(true);
        }
      });

      return clonedNode;
    }

    //setup event triggers to close popups
    [".project-cards_overlay", ".project-popups-close"].forEach(
      (closeTrigger) => {
        document.querySelector(`${closeTrigger}`).onclick = () => {
          closeLocationsPopup();
        };
      },
    );

    // render on clustering end
    google.maps.event.addListener(markerCluster, "clusteringend", function () {
      // remove empty clusters each time we refresh or filter
      removeEmptyClusters();
    });

    //add markers to clusterer
    markerCluster.addMarkers(gmarkers);

    //FILTERING
    //setUpFilters
    var checkboxes = document.querySelectorAll("[data-selection]");

    let regionSet = new Set();
    let statusSet = new Set();
    let managementSet = new Set();
    let managementCounter = 0;

    checkboxes.forEach(function (checkbox) {
      //add/remove regions
      if (checkbox.dataset.selection === "region") {
        regionSet.add(checkbox.dataset.region);
      }

      //add/remove status
      if (checkbox.dataset.selection === "status") {
        statusSet.add(checkbox.dataset.status);
      }

      //add/remove management
      if (checkbox.dataset.selection === "management") {
        managementSet.add(checkbox.dataset.name);
        managementCounter = managementCounter + 1;
      }

      //run filter on each click
      checkbox.addEventListener("click", () => {
        //filter regions
        if (checkbox.dataset.selection === "region") {
          if (checkbox.checked) {
            regionSet.add(checkbox.dataset.region);
          } else {
            regionSet.delete(checkbox.dataset.region);
          }
        }

        //filter status
        if (checkbox.dataset.selection === "status") {
          if (checkbox.checked) {
            statusSet.add(checkbox.dataset.status);
          } else {
            statusSet.delete(checkbox.dataset.status);
          }
        }

        //filter management
        if (checkbox.dataset.selection === "management") {
          if (checkbox.checked) {
            managementSet.add(checkbox.dataset.name);
          } else {
            managementSet.delete(checkbox.dataset.name);

          }
        }

        //RUN EACH TIME A CHECKBOX IS CLICKED
        runFilter();
      });
    });

    //management filter
    document
      .querySelector("[data-selection='mngmt']")
      .addEventListener("click", () => {
        document.querySelector(".m_select-all.is-management").click();
      });

    //Auto complete search implementation
    const autoCompleteJS = new autoComplete({
      selector: ".m_search-field",
      placeHolder: "Search",
      name: "auto-complete",
      data: {
        src: gmarkers,
        keys: ["name"],
      },
      tabSelect: true,
      searchEngine: "loose",
      maxResults: 8,
      threshold: 1,
      resultsList: {
        element: (list, data) => {
          if (!data.results.length) {
            // Create "No Results" message element
            const message = document.createElement("div");
            // Add class to the created element
            message.classList.add("empty_search");
            // Add message text content
            message.innerHTML = `<span>Found No Results for "${data.query}"</span>`;
            // Append message element to the results list
            list.prepend(message);
          }
        },
        noResults: true,
      },
      events: {
        input: {
          focus: () => {
            if (autoCompleteJS.input.value.length) {
              autoCompleteJS.start();
            }
          },
          selection: (event) => {
            const selection = event.detail.selection.value.name;
            autoCompleteJS.input.value = selection;

            filterSearch(selection);
            // simulate event so CMS filter registers the change
            const simulatedEvent = new Event("input", { bubbles: true });
            autoCompleteJS.input.dispatchEvent(simulatedEvent);
          },
        },
      },
      resultItem: {
        highlight: {
          render: true,
        },
      },
    });

    autoCompleteJS.start();

    document.querySelector(".m_search-field").onblur = () => {
      if (autoCompleteJS.input.value.length > 0) {
        searchTerm = autoCompleteJS.input.value;
        filterSearch(searchTerm);
      } else {
        filterSearch("");
      }
    };

    //runs filter based on search bar
    function filterSearch(name) {
      let filteredMarkers = [];

      gmarkers.forEach((marker) => {
        if (marker.name === name) {
          filteredMarkers.push(marker);
        }
      });

      if (filteredMarkers.length > 0) {
        resetMarkers(filteredMarkers);
      } else {
        resetMarkers(gmarkers);
        runFilter();
      }

      resetClusters();
    }

    function filterArray(array, filters) {
      const filterKeys = Object.keys(filters);
      return array.filter((item) => {
        // validates all filter criteria
        return filterKeys.every((key) => {
          // ignores non-function predicates
          if (typeof filters[key] !== "function") return true;
          return filters[key](item[key]);
        });
      });
    }

    function runFilter() {
      // ignores case-sensitive
      let gmarkerFilters = {};

      //filter regions
      let regionFilters = [...regionSet];
      //don't add region filter if we don't have any regions set
      if (regionFilters.length > -1) {
        gmarkerFilters.region = (region) => {
          if (regionFilters.indexOf(region) > -1) {
            return true;
          } else {
            return false;
          }
        };
      }

      //filter status
      let statusFilters = [...statusSet];
   
      if (statusFilters.length > -1) {
        gmarkerFilters.status = (status) => {
          
          let result;
          
          if(status.find((x) => statusFilters.includes(x))){

            result = true;
          }else{
            result = false;
          }
          
          return result;
        }
      }



      //filter management
      let managementFilter = [...managementSet];

      //don't filter by management when all the options are selected
      if(managementFilter.length === managementCounter){
        gmarkerFilters.management = null;
      }else{
        if (managementFilter.length > -1) {
          gmarkerFilters.management = (management) =>
          management.find((x) => managementFilter.includes(x));
        }
  
      }

      
      const filteredMarkers = filterArray(gmarkers, gmarkerFilters);

      resetMarkers(filteredMarkers);
      resetClusters();
    }

    function resetMarkers(markers) {
      gmarkers.forEach((marker) => {
        marker.setVisible(false);
      });

      markers.forEach((marker) => {
        marker.setVisible(true);
      });
    }

    //run filter when page first loads
    // runFilter();

    //reset the clusters
    function resetClusters() {
      markerCluster.clearMarkers();

      markerCluster.addMarkers(gmarkers);
      markerCluster.render();
    }

    //check for empty clusters and remove them
    function removeEmptyClusters() {
      const clusters = markerCluster.clusters;

      clusters.forEach((cluster) => {
        if (cluster.count < 1) {
          cluster.delete();
        }
      });
    }

    //set up SELECT/DESELECT ALL
    let setChecked = true;

    function selectAllInit() {
      const checkboxDropdowns = [
        ...document.querySelectorAll(".m_dropdown-form"),
      ];

      checkboxDropdowns.forEach((dropdown) => {
        const selectButton = dropdown.querySelector(".m_select-all");

        const dropdownCheckboxes = [
          ...dropdown.querySelectorAll("[data-selection]"),
        ];

        dropdownCheckboxes.forEach((checkbox) => {
          checkbox.addEventListener("click", () => {
            if (verifyCheckboxes(dropdownCheckboxes)) {
              selectButton.innerHTML = "Deselect All";
              setChecked = false;
            } else {
              selectButton.innerHTML = "Select All";
              setChecked = true;
            }
          });

          if (verifyCheckboxes(dropdownCheckboxes)) {
            selectButton.innerHTML = "Deselect All";
            setChecked = false;
          } else {
            selectButton.innerHTML = "Select All";
            setChecked = true;
          }
        });

        selectButton.onclick = () => {
          if (setChecked) {
            dropdownCheckboxes.forEach((checkbox) => {
              if (!checkbox.checked) {
                checkbox.click();
                checkbox.checked = true;
              }
            });
          } else {
            dropdownCheckboxes.forEach((checkbox) => {
              if (checkbox.checked) {
                checkbox.click();
                checkbox.checked = false;
              }
            });
          }
        };
      });
    }

    selectAllInit();

    function verifyCheckboxes(dropdownCheckboxes) {
      let allSelected = true;

      //check if there's a checkbox that's not checked
      dropdownCheckboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
          allSelected = false;
        }
      });

      return allSelected;
    }

    console.log(gmarkers);

    //Export as pdf
    // var exportButtonEl = document.querySelector(".export-pdf");

    // exportButtonEl.addEventListener("click", function (e) {
    //   var opt = {
    //     margin: 0.8,
    //     filename: "mylocations.pdf",
    //     image: { type: "jpeg", quality: 0.98 },
    //     html2canvas: { scale: 2 },
    //     jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
    //   };

    //   var outputHtml = `<div style="font-family: arial; text-align: left">`;
    //   var index = 1;

    //   gmarkers.forEach(function (marker) {
    //     if (marker.visible === true) {
    //       outputHtml = outputHtml.concat(
    //         `<p style="font-weight:bold; margin-top: 0; margin-bottom: 12px; text-align:left">${index}. ${marker.name}</p><p style="margin-top: 0; margin-bottom: 32px; text-align:left">${marker.description}</p>`
    //       );
    //       index++;
    //     }
    //   });

    //   outputHtml = outputHtml.concat("</div>");

    //   html2pdf().set(opt).from(outputHtml).save();
    // });

    // //Generate sharable link
    // var generateLinkButtonEl = document.querySelector(".generate-link");
    // var linkCopiedPopup = document.querySelector(".link-copied-popup");

    // generateLinkButtonEl.addEventListener("click", function (e) {
    //   var baseUrl =
    //     window.location.protocol +
    //     "//" +
    //     window.location.host +
    //     window.location.pathname +
    //     "";
    //   var url = new URL(baseUrl);

    //   var regions = "";
    //   var services = "";
    //   var status = "";

    //   checkboxes.forEach(function (checkbox) {
    //     if (checkbox.checked) {
    //       if (checkbox.dataset.selection === "region") {
    //         if (regions === "") {
    //           regions += checkbox.id;
    //         } else {
    //           regions += `_${checkbox.id}`;
    //         }
    //       } else if (checkbox.dataset.selection === "service") {
    //         if (services === "") {
    //           services += checkbox.id;
    //         } else {
    //           services += `_${checkbox.id}`;
    //         }
    //       } else if (checkbox.dataset.selection === "status") {
    //         if (status === "") {
    //           status += checkbox.id;
    //         } else {
    //           status += `_${checkbox.id}`;
    //         }
    //       }
    //     }
    //   });

    //   url.searchParams.set("region", regions);
    //   url.searchParams.set("services", services);
    //   url.searchParams.set("status", status);

    //   const el = document.createElement("textarea");
    //   el.value = url.href;
    //   document.body.appendChild(el);
    //   el.select();
    //   document.execCommand("copy");
    //   document.body.removeChild(el);

    //   linkCopiedPopup.style.opacity = "1";

    //   setTimeout(function () {
    //     linkCopiedPopup.style.opacity = "0";
    //   }, 400);
    // });

    //Checking Link for filters
    // var url_string = window.location.href;

    // if (url_string.includes("?")) {
    //   //Set all checboxes to be unchecked
    //   checkboxes.forEach(function (checkbox) {
    //     checkbox.click();
    //   });
    //   var url = new URL(url_string);
    //   var region = url.searchParams.get("region").split("_");
    //   var services = url.searchParams.get("services").split("_");
    //   var status = url.searchParams.get("status").split("_");

    //   var allFilters = [].concat(region, services, status);

    //   allFilters.forEach(function (filter) {
    //     checkboxes.forEach(function (checkbox) {
    //       if (checkbox.id === filter) {
    //         checkbox.click();
    //       }
    //     });
    //   });
    // }
  }, 100);
};
