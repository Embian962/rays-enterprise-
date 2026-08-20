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
            <img src="${product.image}" alt="${product.name}">
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
            existingProduct.quantity >= stock
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


        const matchesCategory =
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


if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            filterProducts(
                currentCategory
            );

        }
    );

}


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {

    const apiUrl = (window.RAYS_API_URL || "").replace(/\/$/, "");

    if (apiUrl) {
        try {
            const response = await fetch(apiUrl + "/api/products");

            if (!response.ok) {
                throw new Error("Could not load products from the store server.");
            }

            saveProducts(await response.json());
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


    const products =
        getProducts();


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


    products.forEach(function(product) {

        const productCard =
            document.createElement("div");


        productCard.className =
            "product-card " +
            product.category;


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
                    src="${product.image}"
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


                <p class="${
                    isAvailable
                        ? "stock-available"
                        : "stock-unavailable"
                }">

                    ${
                        isAvailable
                            ? stock + " in stock"
                            : "Out of stock"
                    }

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
                    ${
                        !isAvailable
                            ? "disabled"
                            : ""
                    }
                >

                    ${
                        isAvailable
                            ? "Add to Cart"
                            : "Out of Stock"
                    }

                </button>

                <button
                    type="button"
                    class="save-to-list-button"
                >
                    Save to My List
                </button>

            </div>

        `;


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


        if (
            isAvailable &&
            addButton
        ) {

            addButton.addEventListener(
                "click",
                function() {

                    const colorSelect =
                        productCard.querySelector(
                            ".product-colour-select"
                        );

                    addToCart(
                        product.name,
                        colorSelect
                            ? colorSelect.value
                            : ""
                    );

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
    const refreshedOrders = await Promise.all(savedOrders.map(async function(order) {
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

    saveOrders(refreshedOrders);
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

    checkoutForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


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

            const products =
                getProducts();


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

    reviewForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const feedback = {
            customerName: document.getElementById("reviewName").value.trim(),
            productName: document.getElementById("reviewProduct").value,
            rating: Number(document.getElementById("reviewRating").value),
            comment: document.getElementById("reviewComment").value.trim()
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
            alert("Thank you for your feedback!");
        } catch (error) {
            alert(error.message || "Your feedback could not be sent. Please try again.");
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
