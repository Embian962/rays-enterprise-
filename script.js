
// ==========================================
// CUSTOMER GOOGLE SIGN-IN
// ==========================================

(function setupCustomerAuth() {
    const accountButton = document.getElementById("customer-auth-button");
    const page = document.getElementById("account-page");
    const back = document.getElementById("account-back-button");
    const status = document.getElementById("account-page-status");
    const title = document.getElementById("account-page-title");
    const signIn = document.getElementById("account-page-sign-in");
    const createAccount = document.getElementById("account-page-create");
    const signOut = document.getElementById("account-page-sign-out");
    if (!accountButton || !page || !window.supabase || !window.RAYS_SUPABASE_URL || !window.RAYS_SUPABASE_ANON_KEY) return;
    const client = window.supabase.createClient(window.RAYS_SUPABASE_URL, window.RAYS_SUPABASE_ANON_KEY);
    let session = null;
    const update = function(nextSession) {
        session = nextSession;
        window.raysCustomerSession = session;
        const user = session && session.user;
        if (user) {
            const name = user.user_metadata?.full_name || user.email || "Customer";
            title.textContent = "Your account"; status.textContent = "Signed in as " + name;
            signIn.hidden = true; createAccount.hidden = true; signOut.hidden = false;
        } else {
            title.textContent = "Welcome"; status.textContent = "Sign in to save your list and view your orders.";
            signIn.hidden = false; createAccount.hidden = false; signOut.hidden = true;
        }
    };
    const openPage = function() { page.hidden = false; document.body.classList.add("account-page-open"); update(session); window.scrollTo(0, 0); };
    const closePage = function() { page.hidden = true; document.body.classList.remove("account-page-open"); };
    const startGoogle = async function() {
        const redirectBase = /^(localhost|127\.)/.test(window.location.hostname) ? "https://rays-enterprise-sw87.vercel.app" : window.location.origin;
        const result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectBase + window.location.pathname } });
        if (result.error) alert("Google sign-in is not available yet. Please try again later.");
    };
    accountButton.addEventListener("click", openPage);
    back.addEventListener("click", closePage);
    signIn.addEventListener("click", startGoogle); createAccount.addEventListener("click", startGoogle);
    signOut.addEventListener("click", async function() { await client.auth.signOut(); update(null); });
    client.auth.getSession().then(function(result) { update(result.data.session); });
    client.auth.onAuthStateChange(function(_event, nextSession) { update(nextSession); });
})();

// ==========================================
// RAY'S ENTERPRISE
// CUSTOMER CATALOG
// ==========================================


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let cart = [];

let myList = getMyList();

let currentCategory = "all";
// Customer-selectable light/dark storefront theme.
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("rays-theme") || "light";

function applyTheme(theme) {
    const darkMode = theme === "dark";
    document.body.classList.toggle("dark-mode", darkMode);
    if (themeToggle) {
        themeToggle.textContent = darkMode ? "Light mode" : "Dark mode";
        themeToggle.setAttribute("aria-label", darkMode ? "Switch to light mode" : "Switch to dark mode");
    }
}

applyTheme(savedTheme);
if (themeToggle) {
    themeToggle.addEventListener("click", function() {
        const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
        localStorage.setItem("rays-theme", nextTheme);
        applyTheme(nextTheme);
    });
}


// ==========================================
// MPESA
// ==========================================

const MPESA_PAYBILL = "522533";
const MPESA_ACCOUNT = "8061372";


// ==========================================
// STORAGE
// ==========================================

function getProducts() {

    return JSON.parse(
        localStorage.getItem("products")
    ) || [];

}


function saveProducts(products) {

    localStorage.setItem(
        "products",
        JSON.stringify(products)
    );

}


function getOrders() {

    return JSON.parse(
        localStorage.getItem("orders")
    ) || [];

}


function saveOrders(orders) {

    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );

}


// ==========================================
// CART TOTAL
// ==========================================

function getCartTotal() {

    let total = 0;

    cart.forEach(function(product) {

        total +=
            Number(product.price) *
            Number(product.quantity);

    });

    return total;

}


// ==========================================
// SHOW CHECKOUT
// ==========================================

function showCheckout() {

    if (cart.length === 0) {

        alert(
            "Your cart is empty. Please add a product first."
        );

        return;
    }


    hideAllSections();


    const checkout =
        document.getElementById("checkout");


    if (!checkout) {
        return;
    }


    checkout.style.display = "block";


    updatePaymentAmount();

    updatePaymentMethod();


    checkout.scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// HIDE CHECKOUT
// ==========================================

function hideCheckout() {

    const checkout =
        document.getElementById("checkout");


    const cartSection =
        document.getElementById("cart");


    if (checkout) {

        checkout.style.display = "none";

    }


    if (cartSection) {

        cartSection.style.display = "block";


        cartSection.scrollIntoView({
            behavior: "smooth"
        });

    }

}


// ==========================================
// HIDE MAIN SECTIONS
// ==========================================

function hideAllSections() {

    const sections = [

        "products",

        "cart",

        "my-list",

        "checkout",

        "order-confirmation",

        "my-orders"

    ];


    sections.forEach(function(id) {

        const section =
            document.getElementById(id);


        if (section) {

            section.style.display = "none";

        }

    });

}


// ==========================================
// SHOW PRODUCTS
// ==========================================

function showProducts(event) {

    if (event) {

        event.preventDefault();

    }


    hideAllSections();


    const products =
        document.getElementById("products");


    const cartSection =
        document.getElementById("cart");


    if (products) {

        products.style.display = "block";

    }


    if (cartSection) {

        cartSection.style.display = "block";

    }


    if (products) {

        products.scrollIntoView({
            behavior: "smooth"
        });

    }

}


// ==========================================
// MY LIST (SAVED PRODUCTS)
// ==========================================

function showCart(event) {

    if (event) {
        event.preventDefault();
    }

    hideAllSections();
    displayCart();

    const section = document.getElementById("cart");

    if (section) {
        section.style.display = "block";
        section.scrollIntoView({ behavior: "smooth" });
    }

}

function showMyList(event) {

    if (event) {
        event.preventDefault();
    }

    hideAllSections();
    displayMyList();

    const section = document.getElementById("my-list");

    if (section) {
        section.style.display = "block";
        section.scrollIntoView({ behavior: "smooth" });
    }

}


function addToMyList(productName) {

    if (myList.includes(productName)) {
        alert(productName + " is already in My List.");
        return;
    }

    myList.push(productName);
    saveMyList();
    displayMyList();
    alert(productName + " was saved to My List.");

}


function removeFromMyList(productName) {

    myList = myList.filter(function(item) {
        return item !== productName;
    });

    saveMyList();
    displayMyList();

}


function displayMyList() {

    const items = document.getElementById("my-list-items");
    const count = document.getElementById("my-list-count");

    if (count) {
        count.textContent = myList.length;
    }

    if (!items) {
        return;
    }

    items.innerHTML = "";

    if (myList.length === 0) {
        items.innerHTML = `
            <div class="empty-cart">
                <h3>Your list is empty</h3>
                <p>Save products to find them easily later.</p>
            </div>
        `;
        return;
    }

    const products = getProducts();

    myList.forEach(function(productName) {

        const product = products.find(function(item) {
            return item.name === productName;
        });

        if (!product) {
            return;
        }

        const item = document.createElement("article");
        item.className = "my-list-item";
        item.innerHTML = `
            <img src="${(product.image_url || product.image) || "rays-enterprise-catalog-logo.jpg"}" alt="${product.name}">
            <div>
                <h3>${product.name}</h3>
                <p>KSh ${Number(product.price || 0).toLocaleString()}</p>
            </div>
            <div class="my-list-actions">
                <button type="button" class="my-list-add-button">Add to Cart</button>
                <button type="button" class="remove-cart-button">Remove</button>
            </div>
        `;

        item.querySelector(".my-list-add-button").addEventListener("click", function() {
            addToCart(product.name, "");
        });

        item.querySelector(".remove-cart-button").addEventListener("click", function() {
            removeFromMyList(product.name);
        });

        items.appendChild(item);

    });

}


// ==========================================
// ADD TO CART
// ==========================================

function addToCart(productName, color) {

    const products =
        getProducts();


    const product =
        products.find(function(item) {

            return item.name === productName;

        });


    if (!product) {

        alert(
            "Product could not be found."
        );

        return;
    }


    const stock =
        Number(product.stock) || 0;


    if (stock <= 0) {

        alert(
            product.name +
            " is currently out of stock."
        );

        return;
    }


    const existingProduct =
        cart.find(function(item) {

            return (
                item.name === productName &&
                item.color === color
            );

        });


    if (existingProduct) {

        if (
            stock > 0 && existingProduct.quantity >= stock
        ) {

            alert(
                "Sorry, only " +
                stock +
                " " +
                product.name +
                " available."
            );

            return;
        }


        existingProduct.quantity++;

    } else {

        cart.push({

            id:
                product.id,

            name:
                product.name,

            price:
                Number(product.price),

            quantity:
                1,

            stock:
                stock,

            color:
                color || ""

        });

    }


    displayCart();
    return true;

}


// ==========================================
// DISPLAY CART
// ==========================================

function displayCart() {

    const cartItems =
        document.getElementById(
            "cart-items"
        );


    const cartTotal =
        document.getElementById(
            "cart-total"
        );
const cartItemCount =
        document.getElementById(
            "cart-item-count"
        );
    const topCartItemCount = document.getElementById("top-cart-item-count");


    if (!cartItems) {
        return;
    }


    cartItems.innerHTML = "";


    let total = 0;

    let itemCount = 0;


    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <h3>
                    Your cart is empty
                </h3>

                <p>
                    Add some products to get started.
                </p>

            </div>

        `;


        if (cartTotal) {

            cartTotal.textContent =
                "0";

        }


        if (cartItemCount) {

            cartItemCount.textContent =
                "0";
            if (topCartItemCount) topCartItemCount.textContent = "0";

        }


        updatePaymentAmount();

        return;
    }


    cart.forEach(function(product, index) {

        const item =
            document.createElement("div");


        item.className =
            "cart-item";


        const itemTotal =
            Number(product.price) *
            Number(product.quantity);


        total += itemTotal;

        itemCount +=
            Number(product.quantity);


        item.innerHTML = `

            <div class="cart-item-info">

                <strong>
                    ${product.name}
                </strong>

                <span>
                    KSh ${Number(
                        product.price
                    ).toLocaleString()}
                    each
                </span>

                ${
                    product.color
                        ? `<span>Colour: ${product.color}</span>`
                        : ""
                }

            </div>


            <div class="cart-item-controls">

                <button
                    type="button"
                    onclick="decreaseQuantity(${index})"
                >
                    −
                </button>


                <span class="cart-quantity">
                    ${product.quantity}
                </span>


                <button
                    type="button"
                    onclick="increaseQuantity(${index})"
                >
                    +
                </button>

            </div>


            <div class="cart-item-total">

                <strong>
                    KSh ${itemTotal.toLocaleString()}
                </strong>


                <button
                    type="button"
                    class="remove-cart-button"
                    onclick="removeFromCart(${index})"
                >
                    Remove
                </button>

            </div>

        `;


        cartItems.appendChild(item);

    });


    if (cartTotal) {

        cartTotal.textContent =
            total.toLocaleString();

    }


    if (cartItemCount) {

        cartItemCount.textContent =
            itemCount;
        if (topCartItemCount) topCartItemCount.textContent = itemCount;

    }


    updatePaymentAmount();

}


// ==========================================
// REMOVE CART ITEM
// ==========================================

function removeFromCart(index) {

    if (!cart[index]) {
        return;
    }


    cart.splice(index, 1);


    displayCart();

}


// ==========================================
// INCREASE QUANTITY
// ==========================================

function increaseQuantity(index) {

    const cartProduct =
        cart[index];


    if (!cartProduct) {
        return;
    }


    const products =
        getProducts();


    const currentProduct =
        products.find(function(product) {

            return product.name ===
                cartProduct.name;

        });


    if (!currentProduct) {

        alert(
            "This product is no longer available."
        );

        removeFromCart(index);

        return;
    }


    const stock =
        Number(currentProduct.stock) || 0;


    if (
        cartProduct.quantity >= stock
    ) {

        alert(
            "Only " +
            stock +
            " available in stock."
        );

        return;
    }


    cartProduct.quantity++;

    cartProduct.stock =
        stock;


    displayCart();

}


// ==========================================
// DECREASE QUANTITY
// ==========================================

function decreaseQuantity(index) {

    const product =
        cart[index];


    if (!product) {
        return;
    }


    if (product.quantity > 1) {

        product.quantity--;

    } else {

        cart.splice(index, 1);

    }


    displayCart();

}


// ==========================================
// SEARCH
// ==========================================

const searchInput =
    document.getElementById(
        "searchInput"
    );

const searchButton = document.getElementById("search-submit");
if (searchButton) {
    searchButton.addEventListener("click", function() {
        filterProducts(currentCategory);
        if (searchInput) searchInput.blur();
        updateSearchEmptyState();
    });
}


function categorySlug(category) {
    return String(category || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function filterProducts(category) {

    currentCategory =
        category;


    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const productCards =
        document.querySelectorAll(
            ".product-card"
        );


    productCards.forEach(function(productCard) {

        const heading =
            productCard.querySelector("h3");


        if (!heading) {
            return;
        }


        const productName =
            heading.textContent
                .toLowerCase();


        // A product-name search is global; categories only filter a blank search.
        const matchesCategory =
            searchText.length > 0 ||
            category === "all" ||
            productCard.classList.contains(
                category
            );


        const matchesSearch =
            productName.includes(
                searchText
            );


        if (
            matchesCategory &&
            matchesSearch
        ) {

            productCard.style.display =
                "";

        } else {

            productCard.style.display =
                "none";

        }

    });

}


function updateSearchEmptyState() {
    const query = searchInput ? searchInput.value.trim() : "";
    const container = document.getElementById("product-container");
    if (!container) return;
    const oldMessage = container.querySelector(".no-search-results");
    if (oldMessage) oldMessage.remove();
    if (!query) return;
    const visibleCards = Array.from(container.querySelectorAll(".product-card"))
        .filter(function(card) { return card.style.display !== "none"; });
    if (visibleCards.length > 0) return;
    const message = document.createElement("div");
    message.className = "no-search-results";
    message.innerHTML = "<h3>No results found</h3><p>Try another product name or clear your search.</p><button type=\"button\">Clear search</button>";
    message.querySelector("button").addEventListener("click", function() {
        searchInput.value = "";
        filterProducts(currentCategory);
        searchInput.focus();
    });
    container.appendChild(message);
}
if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            filterProducts(
                currentCategory
            );

            updateSearchEmptyState();

        }
    );

}


// ==========================================
// LOAD PRODUCTS
// ==========================================

function openProductImage(imageUrl, productName) {
    let lightbox = document.getElementById("product-lightbox");
    if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.id = "product-lightbox";
        lightbox.className = "product-lightbox";
        lightbox.innerHTML = "<button type=\"button\" class=\"lightbox-close\" aria-label=\"Close image preview\">&times;</button><img alt=\"\"><p></p>";
        document.body.appendChild(lightbox);
        lightbox.addEventListener("click", function(event) {
            if (event.target === lightbox || event.target.classList.contains("lightbox-close")) lightbox.classList.remove("is-open");
        });
    }
    const image = lightbox.querySelector("img");
    image.src = imageUrl;
    image.alt = productName;
    lightbox.querySelector("p").textContent = productName;
    lightbox.classList.add("is-open");
    lightbox.querySelector(".lightbox-close").focus();
}

document.addEventListener("keydown", function(event) {
    const lightbox = document.getElementById("product-lightbox");
    if (event.key === "Escape" && lightbox) lightbox.classList.remove("is-open");
});
async function loadProducts() {

    const catalogContainer = document.getElementById("product-container");
    if (catalogContainer) {
        catalogContainer.className = "products product-loading";
        catalogContainer.innerHTML = "<div class=\"product-skeleton\"></div>".repeat(4);
    }

    const apiUrl = (window.RAYS_API_URL || "").replace(/\/$/, "");
    let fetchedProducts = null;

    {
        try {
            const response = await fetch(apiUrl + "/api/products?v=" + Date.now());

            if (!response.ok) {
                throw new Error("Could not load products from the store server.");
            }

            fetchedProducts = await response.json();
            try { saveProducts(fetchedProducts); } catch (storageError) { console.warn("Catalog loaded but could not be cached locally.", storageError); }
        } catch (error) {
            console.warn("Using saved catalog because the store server is unavailable.", error);
        }
    }

    const productContainer =
        document.getElementById(
            "product-container"
        );


    if (!productContainer) {
        return;
    }


    const products = fetchedProducts || getProducts();

    const categoryContainer = document.querySelector(".categories");
    if (categoryContainer) {
        const categories = {};
        products.forEach(function(p) { if (p.category) categories[p.category] = (categories[p.category] || 0) + 1; });
        categoryContainer.innerHTML = "";
        const closeCategoryButton = document.createElement("button");
        closeCategoryButton.type = "button"; closeCategoryButton.className = "category-drawer-close"; closeCategoryButton.setAttribute("aria-label", "Close categories"); closeCategoryButton.textContent = "×";
        closeCategoryButton.addEventListener("click", function() { document.body.classList.remove("categories-drawer-open"); document.getElementById("customer-categories-toggle")?.setAttribute("aria-expanded", "false"); });
        categoryContainer.appendChild(closeCategoryButton);
        const allButton = document.createElement("button");
        allButton.type = "button"; allButton.className = "category-drawer-item"; allButton.textContent = "All Products";
        allButton.addEventListener("click", function() { filterProducts("all"); }); categoryContainer.appendChild(allButton);
        Object.keys(categories).sort().forEach(function(category) {
            const slug = categorySlug(category); const button = document.createElement("button");
            button.type = "button"; button.className = "category-drawer-item"; button.dataset.category = slug;
            button.textContent = category;
            button.addEventListener("click", function() { filterProducts(slug); }); categoryContainer.appendChild(button);
        });
    }


    productContainer.className = "products";

    productContainer.innerHTML = "";


    if (products.length === 0) {

        productContainer.innerHTML = `

            <div class="no-products">

                <h3>
                    No products available
                </h3>

                <p>
                    Products will appear here
                    once they are added.
                </p>

            </div>

        `;

        return;
    }


    products.sort(function(a, b) {
        const aHasImage = !!String(a.image_url || a.image || "").trim();
        const bHasImage = !!String(b.image_url || b.image || "").trim();
        return Number(bHasImage) - Number(aHasImage);
    });

    products.forEach(function(product) {

        const productCard =
            document.createElement("div");


        productCard.className =
            "product-card " +
            categorySlug(product.category);


        const stock =
            Number(product.stock) || 0;


        const price =
            Number(product.price) || 0;

        const colors =
            Array.isArray(product.colors)
                ? product.colors
                : [];


        const isAvailable =
            stock > 0;


        productCard.innerHTML = `

            <div class="product-image-container">

                <img
                    src="${(product.image_url || product.image) || "rays-enterprise-catalog-logo.jpg"}"
                    alt="${product.name}"
                >

            </div>


            <div class="product-info">

                <span class="product-category">
                    ${product.category}
                </span>


                <h3>
                    ${product.name}
                </h3>


                <p class="product-price">
                    KSh ${price.toLocaleString()}
                </p>


                ${
                    colors.length > 0
                        ? `
                            <label class="product-colour-label">
                                Colour
                                <select class="product-colour-select">
                                    ${colors.map(function(color) {
                                        return `<option value="${color}">${color}</option>`;
                                    }).join("")}
                                </select>
                            </label>
                        `
                        : ""
                }


                <button
                    type="button"
                    class="add-to-cart-button"
                    ""
                >

                    "Add to Cart"

                </button>

                <button
                    type="button"
                    class="save-to-list-button"
                >
                    Save to My List
                </button>

            </div>

        `;


        const productImage = productCard.querySelector(".product-image-container img");
        if (productImage) {
            productImage.tabIndex = 0;
            productImage.setAttribute("role", "button");
            productImage.addEventListener("click", function() {
                openProductImage((product.image_url || product.image) || "rays-enterprise-catalog-logo.jpg", product.name);
            });
            productImage.addEventListener("keydown", function(event) {
                if (event.key === "Enter" || event.key === " ") openProductImage((product.image_url || product.image) || "rays-enterprise-catalog-logo.jpg", product.name);
            });
        }
        const addButton =
            productCard.querySelector(
                ".add-to-cart-button"
            );

        const saveButton =
            productCard.querySelector(
                ".save-to-list-button"
            );

        if (saveButton) {
            saveButton.addEventListener("click", function() {
                addToMyList(product.name);
            });
        }


        if (addButton) {

            addButton.addEventListener(
                "click",
                function() {

                    const colorSelect =
                        productCard.querySelector(
                            ".product-colour-select"
                        );

                    if (addToCart(
                        product.name,
                        colorSelect
                            ? colorSelect.value
                            : ""
                    )) {
                        showAddToCartSuccess(addButton);
                    }

                }
            );

        }


        productContainer.appendChild(
            productCard
        );

    });


    filterProducts(
        currentCategory
    );

}


// ==========================================
// PAYMENT METHOD
// ==========================================

function updatePaymentMethod() {

    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );


    const mpesaPayment =
        document.getElementById(
            "mpesa-payment"
        );


    const paymentMade =
        document.getElementById(
            "paymentMade"
        );


    if (!selected) {
        return;
    }


    if (
        selected.value === "order"
    ) {

        if (mpesaPayment) {

            mpesaPayment.style.display =
                "block";

        }


        updatePaymentAmount();

    } else {

        if (mpesaPayment) {

            mpesaPayment.style.display =
                "none";

        }


        if (paymentMade) {

            paymentMade.checked =
                false;

        }

    }

}


// ==========================================
// PAYMENT AMOUNT
// ==========================================

function updatePaymentAmount() {

    const amountElement =
        document.getElementById(
            "mpesa-amount"
        );


    const paybillElement =
        document.getElementById(
            "mpesa-paybill"
        );

    const accountElement =
        document.getElementById(
            "mpesa-account"
        );


    if (amountElement) {

        amountElement.textContent =
            getCartTotal().toLocaleString();

    }


    if (paybillElement) {

        paybillElement.textContent =
            MPESA_PAYBILL;

    }

    if (accountElement) {

        accountElement.textContent =
            MPESA_ACCOUNT;

    }

}


// ==========================================
// PAYMENT RADIO BUTTONS
// ==========================================

const paymentMethods =
    document.querySelectorAll(
        'input[name="paymentMethod"]'
    );


paymentMethods.forEach(function(method) {

    method.addEventListener(
        "change",
        function() {

            updatePaymentMethod();

        }
    );

});


// ==========================================
// ORDER CONFIRMATION
// ==========================================

function showOrderConfirmation(order) {

    hideAllSections();


    const confirmation =
        document.getElementById(
            "order-confirmation"
        );


    if (!confirmation) {
        return;
    }


    const orderNumber =
        document.getElementById(
            "confirmation-order-number"
        );


    const customerName =
        document.getElementById(
            "confirmation-customer-name"
        );


    const customerPhone =
        document.getElementById(
            "confirmation-customer-phone"
        );


    const customerLocation =
        document.getElementById(
            "confirmation-location"
        );


    const paymentMethod =
        document.getElementById(
            "confirmation-payment-method"
        );


    const confirmationStatus =
        document.getElementById(
            "confirmation-status"
        );


    const confirmationTotal =
        document.getElementById(
            "confirmation-total"
        );


    const confirmationProducts =
        document.getElementById(
            "confirmation-products"
        );


    if (orderNumber) {

        orderNumber.textContent =
            order.orderNumber || ("No." + String(order.id).padStart(3, "0"));

    }


    if (customerName) {

        customerName.textContent =
            order.customerName;

    }


    if (customerPhone) {

        customerPhone.textContent =
            order.customerPhone;

    }


    if (customerLocation) {

        customerLocation.textContent =
            order.customerLocation;

    }


    if (paymentMethod) {

        paymentMethod.textContent =
            order.paymentMethod;

    }


    if (confirmationStatus) {

        confirmationStatus.textContent =
            order.status;

    }


    if (confirmationTotal) {

        confirmationTotal.textContent =
            Number(
                order.total
            ).toLocaleString();

    }


    if (confirmationProducts) {

        confirmationProducts.innerHTML =
            "";


        if (
            order.products &&
            order.products.length > 0
        ) {

            order.products.forEach(
                function(product) {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "confirmation-product";


                    const itemTotal =
                        Number(product.price) *
                        Number(product.quantity);


                    row.innerHTML = `

                        <div
                            class="confirmation-product-info"
                        >

                            <strong>
                                ${product.name}
                            </strong>

                            <span>
                                KSh ${Number(
                                    product.price
                                ).toLocaleString()}
                                ×
                                ${product.quantity}
                            </span>

                        </div>


                        <strong>
                            KSh ${itemTotal.toLocaleString()}
                        </strong>

                    `;


                    confirmationProducts.appendChild(
                        row
                    );

                }
            );

        }

    }


    confirmation.style.display =
        "block";


    confirmation.scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// CONTINUE SHOPPING
// ==========================================

function continueShopping() {

    showProducts();

}


// ==========================================
// SHOW MY ORDERS
// ==========================================

function showMyOrders(event) {

    if (event) {

        event.preventDefault();

    }


    hideAllSections();


    const myOrders =
        document.getElementById(
            "my-orders"
        );


    if (!myOrders) {
        return;
    }


    myOrders.style.display =
        "block";


    displayMyOrders();

    refreshCustomerOrderStatuses();


    myOrders.scrollIntoView({
        behavior: "smooth"
    });

}


// Refresh status for orders saved in this browser. The API validates the phone
// number, so one customer cannot retrieve another customer's order details.
async function refreshCustomerOrderStatuses() {
    const savedOrders = getOrders();
    if (!savedOrders.length) return;

    const apiUrl = (window.RAYS_API_URL || "").replace(/\/$/, "");
    let fetchedProducts = null;
    let ordersForRefresh = savedOrders;
    const session = window.raysCustomerSession;
    if (session?.access_token) {
        try {
            const accountResponse = await fetch(apiUrl + "/api/orders/mine", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token } });
            if (accountResponse.ok) {
                const accountOrders = await accountResponse.json();
                saveOrders(accountOrders);
                ordersForRefresh = accountOrders;
            }
        } catch (error) { console.warn("Could not load account orders.", error); }
    }
    const refreshedOrders = await Promise.all(ordersForRefresh.map(async function(order) {
        if (!order.id || !order.customerPhone) return order;
        try {
            const response = await fetch(apiUrl + "/api/orders/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, customerPhone: order.customerPhone })
            });
            if (!response.ok) return order;
            return await response.json();
        } catch (error) {
            console.warn("Could not refresh this order status.", error);
            return order;
        }
    }));

    saveOrders(refreshedOrders.filter(Boolean));
    displayMyOrders();
}
// ==========================================
// DISPLAY MY ORDERS
// ==========================================

function displayMyOrders() {

    const ordersContainer =
        document.getElementById(
            "orders-container"
        );


    if (!ordersContainer) {
        return;
    }


    const orders =
        getOrders();


    ordersContainer.innerHTML =
        "";


    if (orders.length === 0) {

        ordersContainer.innerHTML = `

            <div class="no-orders">

                <h3>
                    No Orders Yet
                </h3>

                <p>
                    Your orders and receipts will
                    appear here after you place an order.
                </p>

            </div>

        `;

        return;
    }


    // Newest orders first

    const reversedOrders =
        [...orders].reverse();


    reversedOrders.forEach(
        function(order) {

            const orderCard =
                document.createElement(
                    "div"
                );


            orderCard.className =
                "order-card";

            orderCard.classList.add("status-" + String(order.status || "Pending").toLowerCase());


            let productsHTML =
                "";


            if (
                order.products &&
                order.products.length > 0
            ) {

                order.products.forEach(
                    function(product) {

                        const itemTotal =
                            Number(product.price) *
                            Number(product.quantity);


                        productsHTML += `

                            <div
                                class="my-order-product"
                            >

                                <div>

                                    <strong>
                                        ${product.name}
                                    </strong>

                                    <span>
                                        KSh ${Number(
                                            product.price
                                        ).toLocaleString()}
                                        ×
                                        ${product.quantity}
                                    </span>

                                </div>


                                <strong>
                                    KSh ${itemTotal.toLocaleString()}
                                </strong>

                            </div>

                        `;

                    }
                );

            } else {

                productsHTML = `

                    <p>
                        No product details available.
                    </p>

                `;

            }


            orderCard.innerHTML = `

                <div
                    class="order-card-header"
                >

                    <div>

                        <span>
                            Order Number
                        </span>

                        <strong>
                            ${order.orderNumber || ("No." + String(order.id).padStart(3, "0"))}
                        </strong>

                    </div>


                    <span
                        class="order-status"
                    >
                        ${order.status}
                    </span>

                </div>


                <div
                    class="order-date"
                >

                    <strong>
                        Date:
                    </strong>

                    ${order.date}

                </div>


                <div
                    class="my-order-products"
                >

                    <h3>
                        Items
                    </h3>

                    ${productsHTML}

                </div>


                <div
                    class="my-order-details"
                >

                    <p>

                        <strong>
                            Payment:
                        </strong>

                        ${order.paymentMethod}

                    </p>


                    <p>

                        <strong>
                            Delivery:
                        </strong>

                        ${order.customerLocation}

                    </p>

                </div>


                <div
                    class="my-order-total"
                >

                    <span>
                        Total
                    </span>


                    <strong>
                        KSh ${Number(
                            order.total
                        ).toLocaleString()}
                    </strong>

                </div>

            `;


            ordersContainer.appendChild(
                orderCard
            );

        }
    );

}


// ==========================================
// CHECKOUT FORM
// ==========================================

const checkoutForm =
    document.getElementById(
        "checkoutForm"
    );


if (checkoutForm) {

    let checkoutSubmitting = false;

    checkoutForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            if (checkoutSubmitting) return;


            // CART CHECK

            if (cart.length === 0) {

                alert(
                    "Your cart is empty. Please add a product first."
                );

                return;
            }


            // CUSTOMER DETAILS

            const customerName =
                document.getElementById(
                    "customerName"
                ).value.trim();


            const customerPhone =
                document.getElementById(
                    "customerPhone"
                ).value.trim();


            const customerLocation =
                document.getElementById(
                    "customerLocation"
                ).value.trim();


            const customerNotes =
                document.getElementById(
                    "customerNotes"
                ).value.trim();


            // PAYMENT

            const selectedPayment =
                document.querySelector(
                    'input[name="paymentMethod"]:checked'
                );


            if (!selectedPayment) {

                alert(
                    "Please select a payment method."
                );

                return;
            }


            const paymentMethod =
                selectedPayment.value;


            // CUSTOMER VALIDATION

            if (
                !customerName ||
                !customerPhone ||
                !customerLocation
            ) {

                alert(
                    "Please fill in all required customer details."
                );

                return;
            }


            // MPESA VALIDATION

            const paymentMade =
                document.getElementById(
                    "paymentMade"
                );


            if (
                paymentMethod === "order"
            ) {

                if (
                    !paymentMade ||
                    !paymentMade.checked
                ) {

                    alert(
                        "Please make the M-Pesa payment and confirm that you have paid."
                    );

                    return;
                }

            }


            // PRODUCTS

            const products = getProducts();


            // STOCK CHECK

            for (
                let i = 0;
                i < cart.length;
                i++
            ) {

                const cartProduct =
                    cart[i];


                const currentProduct =
                    products.find(
                        function(product) {

                            return product.name ===
                                cartProduct.name;

                        }
                    );


                if (!currentProduct) {

                    alert(
                        cartProduct.name +
                        " is no longer available."
                    );

                    loadProducts();

                    return;
                }


                const currentStock =
                    Number(
                        currentProduct.stock
                    ) || 0;


                if (
                    cartProduct.quantity >
                    currentStock
                ) {

                    alert(
                        cartProduct.name +
                        " only has " +
                        currentStock +
                        " left in stock."
                    );

                    loadProducts();

                    return;
                }

            }


            // TOTAL

            const orderTotal =
                getCartTotal();


            // PAYMENT STATUS

            const paymentStatus =
                paymentMethod === "order"
                    ? "Paid"
                    : "Pay on Delivery";


            // CREATE ORDER

            const clientRequestId = checkoutForm.dataset.requestId || crypto.randomUUID();
            checkoutForm.dataset.requestId = clientRequestId;
            checkoutSubmitting = true;
            const placeOrderButton = document.getElementById("place-order-button");
            if (placeOrderButton) {
                placeOrderButton.disabled = true;
                placeOrderButton.setAttribute("aria-busy", "true");
            }

            let order = {

                id:
                    Date.now(),

                customerName:
                    customerName,

                customerPhone:
                    customerPhone,

                customerLocation:
                    customerLocation,

                customerNotes:
                    customerNotes,

                products:
                    cart.map(
                        function(product) {

                            return {

                                id: product.id,

                                name:
                                    product.name,

                                price:
                                    product.price,

                                quantity:
                                    product.quantity

                            };

                        }
                    ),

                total:
                    orderTotal,

                paymentMethod:
                    paymentMethod === "order"
                        ? "Pay on Order"
                        : "Pay on Delivery",

                paymentStatus:
                    paymentStatus,

                status:
                    "Pending",

                clientRequestId:
                    clientRequestId,

                customerEmail:
                    window.raysCustomerSession?.user?.email || "",

                date:
                    new Date().toLocaleString()

            };

            // Save to the shared server first. This makes the order visible
            // to administrators on every signed-in phone and PC.
            try {
                const response = await fetch((window.RAYS_API_URL || "").replace(/\/$/, "") + "/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(order)
                });
                const body = await response.json().catch(function() { return {}; });
                if (!response.ok) throw new Error(body.error || "Could not save your order.");
                order = body;
            } catch (error) {
                alert(error.message || "Your order could not be sent. Please try again.");
                checkoutSubmitting = false;
                if (placeOrderButton) {
                    placeOrderButton.disabled = false;
                    placeOrderButton.removeAttribute("aria-busy");
                }
                return;
            }

            // Keep a local copy only for the customer's order-history view.
            const orders =
                getOrders();


            orders.push(order);


            saveOrders(orders);


            // REDUCE STOCK

            cart.forEach(
                function(cartProduct) {

                    const product =
                        products.find(
                            function(item) {

                                return item.name ===
                                    cartProduct.name;

                            }
                        );


                    if (product) {

                        product.stock =
                            Math.max(
                                0,
                                Number(
                                    product.stock
                                ) -
                                Number(
                                    cartProduct.quantity
                                )
                            );

                    }

                }
            );


            saveProducts(
                products
            );


            // CLEAR CART

            cart = [];


            displayCart();


            // RESET FORM

            checkoutForm.reset();
            delete checkoutForm.dataset.requestId;
            checkoutSubmitting = false;
            if (placeOrderButton) {
                placeOrderButton.disabled = false;
                placeOrderButton.removeAttribute("aria-busy");
            }


            // HIDE MPESA

            const mpesaPayment =
                document.getElementById(
                    "mpesa-payment"
                );


            if (mpesaPayment) {

                mpesaPayment.style.display =
                    "none";

            }


            // REFRESH PRODUCTS

            loadProducts();


            // SHOW RECEIPT

            showOrderConfirmation(
                order
            );

        }
    );

}


function getMyList() {

    return JSON.parse(
        localStorage.getItem("my-list")
    ) || [];

}


function saveMyList() {

    localStorage.setItem(
        "my-list",
        JSON.stringify(myList)
    );

}


// ==========================================
// CUSTOMER REVIEWS
// ==========================================

function populateReviewProducts() {

    const productSelect =
        document.getElementById("reviewProduct");


    if (!productSelect) {
        return;
    }


    getProducts().forEach(function(product) {

        const option = document.createElement("option");

        option.value = product.name;
        option.textContent = product.name;

        productSelect.appendChild(option);

    });

}


const reviewForm =
    document.getElementById("reviewForm");


if (reviewForm) {

    let reviewSubmitting = false;

    reviewForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        if (reviewSubmitting) return;
        const clientRequestId = reviewForm.dataset.requestId || crypto.randomUUID();
        reviewForm.dataset.requestId = clientRequestId;
        reviewSubmitting = true;
        const sendFeedbackButton = reviewForm.querySelector('button[type="submit"]');
        if (sendFeedbackButton) {
            sendFeedbackButton.disabled = true;
            sendFeedbackButton.setAttribute("aria-busy", "true");
        }
        const feedback = {
            customerName: document.getElementById("reviewName").value.trim(),
            productName: document.getElementById("reviewProduct").value,
            rating: Number(document.getElementById("reviewRating").value),
            comment: document.getElementById("reviewComment").value.trim(),
            clientRequestId: clientRequestId
        };
        try {
            const response = await fetch((window.RAYS_API_URL || "").replace(/\/$/, "") + "/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(feedback)
            });
            const body = await response.json().catch(function() { return {}; });
            if (!response.ok) throw new Error(body.error || "Could not send feedback.");
            reviewForm.reset();
            delete reviewForm.dataset.requestId;
            alert("Thank you for your feedback!");
        } catch (error) {
            alert(error.message || "Your feedback could not be sent. Please try again.");
        } finally {
            reviewSubmitting = false;
            if (sendFeedbackButton) {
                sendFeedbackButton.disabled = false;
                sendFeedbackButton.removeAttribute("aria-busy");
            }
        }
    });

}


// ==========================================
// CONTACT / WHATSAPP
// ==========================================

const contactForm =
    document.getElementById("contactForm");


if (contactForm) {

    contactForm.addEventListener("submit", function(event) {

        event.preventDefault();


        const name =
            document.getElementById("contactName").value.trim();

        const message =
            document.getElementById("contactMessage").value.trim();


        const whatsappMessage =
            "Hello Ray's Enterprise,\n\n" +
            "My name is " + name + ".\n\n" +
            "Inquiry: " + message;


        window.open(
            "https://wa.me/254757598447?text=" +
            encodeURIComponent(whatsappMessage),
            "_blank",
            "noopener"
        );


        contactForm.reset();

    });

}


// ==========================================
// INITIALIZE
// ==========================================

loadProducts();

populateReviewProducts();

displayCart();

displayMyList();

updatePaymentMethod();


function showAddToCartSuccess(button) {
    const topCartLink = document.querySelector("a[href=\"#cart\"]");
    if (topCartLink) { topCartLink.classList.remove("is-bouncing"); void topCartLink.offsetWidth; topCartLink.classList.add("is-bouncing"); }
    const cartCount = document.getElementById("cart-item-count");
    button.classList.remove("is-added");
    void button.offsetWidth;
    button.classList.add("is-added");
    button.textContent = "? Added to Cart";
    if (cartCount) {
        cartCount.classList.remove("cart-count-pop");
        void cartCount.offsetWidth;
        cartCount.classList.add("cart-count-pop");
    }
    clearTimeout(button._successTimer);
    button._successTimer = setTimeout(function() {
        button.classList.remove("is-added");
        button.textContent = "Add to Cart";
    }, 1600);
}

document.addEventListener("click", function(event) {
    const button = event.target.closest(".add-to-cart-button");
    if (!button || button.disabled) return;
    setTimeout(function() { showAddToCartSuccess(button); }, 0);
});













// Trust information side dashboard
(function setupTrustPanel() {
    const panel = document.getElementById("customer-trust");
    const open = document.getElementById("customer-trust-toggle");
    const close = document.getElementById("close-customer-trust");
    if (!panel || !open || !close) return;
    const setOpen = function(value) { panel.hidden = !value; document.body.classList.toggle("trust-panel-open", value); open.setAttribute("aria-expanded", String(value)); };
    open.addEventListener("click", function() { setOpen(true); });
    close.addEventListener("click", function() { setOpen(false); });
})();

// Customer categories drawer
(function setupCategoriesDrawer() {
    const toggle = document.getElementById("customer-categories-toggle");
    const panel = document.querySelector(".categories");
    if (!toggle || !panel) return;
    const close = function() { document.body.classList.remove("categories-drawer-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", function() { const open = !document.body.classList.contains("categories-drawer-open"); document.body.classList.toggle("categories-drawer-open", open); toggle.setAttribute("aria-expanded", String(open)); });
    panel.addEventListener("click", function(event) { if (event.target.closest("button")) close(); });
    document.addEventListener("keydown", function(event) { if (event.key === "Escape") close(); });
})();
















