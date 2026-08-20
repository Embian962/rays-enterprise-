// ==========================================
// RAY'S ENTERPRISE - ADMIN PANEL
// ==========================================


// ==========================================
// LOAD PRODUCTS
// ==========================================

let products = [];

let adminToken = sessionStorage.getItem("rays-admin-token") || "";

function getApiUrl() {
    return (window.RAYS_API_URL || "").replace(/\/$/, "");
}

async function adminRequest(path, options = {}) {
    if (!adminToken) {
        alert("Sign in above before changing products.");
        return null;
    }

    const response = await fetch(getApiUrl() + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + adminToken,
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const body = await response.json().catch(function() { return {}; });
        if (response.status === 401) {
            sessionStorage.removeItem("rays-admin-token");
            adminToken = "";
        }
        throw new Error(body.error || "The server could not save this change.");
    }

    return response;
}

async function loadAdminProducts() {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;

    try {
        const response = await fetch(apiUrl + "/api/products");
        if (!response.ok) throw new Error("Could not load products.");
        products = await response.json();
        displayAdminProducts();
        updateDashboard();
    } catch (error) {
        console.warn("Could not load products from the store server.", error);
    }
}


// The filter currently selected from the dashboard. Keeping this value means
// a status update refreshes the same view instead of unexpectedly switching
// the administrator to a different category.
let activeOrderFilter = "all-orders";

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginStatus = document.getElementById("adminLoginStatus");
const adminLogoutButton = document.getElementById("adminLogoutButton");
const adminLoginSection = document.getElementById("admin-login");

function updateAdminLoginStatus() {
    if (adminLoginStatus) adminLoginStatus.textContent = adminToken ? "Signed in" : "Sign in to add, edit, or delete products.";
    if (adminLogoutButton) adminLogoutButton.style.display = adminToken ? "inline-block" : "none";
    if (adminLoginSection) {
        if (adminToken) {
            adminLoginSection.classList.add("hidden");
            adminLoginSection.setAttribute("aria-hidden", "true");
        } else {
            adminLoginSection.classList.remove("hidden");
            adminLoginSection.setAttribute("aria-hidden", "false");
        }
    }

    try {
        console.debug("updateAdminLoginStatus:", {
            tokenLength: adminToken ? adminToken.length : 0,
            adminLoginSectionFound: !!adminLoginSection,
            adminLogoutButtonFound: !!adminLogoutButton
        });
    } catch (e) {
        /* ignore */
    }
}

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        try {
            const response = await fetch(getApiUrl() + "/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: document.getElementById("adminUsername").value.trim(),
                    password: document.getElementById("adminPassword").value.trim()
                })
            });
            const body = await response.json().catch(function() { return {}; });
            if (!response.ok) {
                throw new Error(body.error || "The sign-in service returned an unexpected response.");
            }
            if (!body.token) throw new Error("The sign-in service did not return a session token.");
            adminToken = body.token;
            sessionStorage.setItem("rays-admin-token", adminToken);
            document.getElementById("adminPassword").value = "";
            updateAdminLoginStatus();
            loadSharedAdminData();
        } catch (error) {
            const message = error instanceof TypeError && error.message === "Failed to fetch"
                ? "Could not reach the sign-in service. Please try again in a moment."
                : error.message;
            if (adminLoginStatus) adminLoginStatus.textContent = message;
            alert(message);
        }
    });
}

if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", function() {
        sessionStorage.removeItem("rays-admin-token");
        adminToken = "";
        updateAdminLoginStatus();
    });
}


// ==========================================
// ADD PRODUCT
// ==========================================

const productForm =
    document.getElementById("productForm");

// The API accepts up to 25 MB of JSON. A base64 data URL is about 33% larger
// than the source image, so cap the selected image before trying to upload it.
const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024;

productForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const name =
        document.getElementById("productName").value.trim();

    const price =
        Number(
            document.getElementById("productPrice").value
        );

    const stock =
        Number(
            document.getElementById("productStock").value
        );

    const category =
        document.getElementById("productCategory").value;

    const colors =
        document.getElementById("productColors").value
            .split(",")
            .map(function(color) {
                return color.trim();
            })
            .filter(function(color) {
                return color !== "";
            });

    const imageFile =
        document.getElementById("productImage").files[0];


    if (!imageFile) {

        alert("Please choose a product image.");

        return;
    }

    if (imageFile.size > MAX_PRODUCT_IMAGE_BYTES) {

        alert("Please choose a product image smaller than 15 MB.");

        return;
    }


    const reader = new FileReader();


    reader.onload = async function(event) {

        const product = {

            name: name,
            price: price,
            stock: stock,
            category: category,
            colors: colors,
            image: event.target.result

        };


        try {
            const response = await adminRequest("/api/products", {
                method: "POST",
                body: JSON.stringify(product)
            });

            if (!response) return;

            products.unshift(await response.json());
        } catch (error) {
            // If the API is unreachable or returns an error, fall back to
            // storing products locally so the admin UI remains usable.
            console.warn("API product save failed, falling back to localStorage:", error);
            products.unshift(product);
            try {
                localStorage.setItem("products", JSON.stringify(products));
            } catch (e) {
                console.error("Could not save product to localStorage.", e);
                alert(error.message);
                return;
            }
            alert("Product saved locally (API unavailable). It will not be shared to the storefront.");
        }


        alert("Product added successfully!");


        productForm.reset();


        displayAdminProducts();

        updateDashboard();

    };


    reader.readAsDataURL(imageFile);

});


// ==========================================
// DISPLAY PRODUCTS
// ==========================================

function displayAdminProducts() {

    const productList =
        document.getElementById("admin-product-list");


    if (!productList) {
        return;
    }


    productList.innerHTML = "";


    if (products.length === 0) {

        productList.innerHTML =
            "<p>No products added yet.</p>";

        return;
    }


    products.forEach(function(product, index) {

        const productItem =
            document.createElement("div");


        productItem.className =
            "admin-product";


        const stock =
            Number(product.stock) || 0;


        productItem.innerHTML = `

            <img
                src="${product.image}"
                alt="${product.name}"
                style="
                    width: 150px;
                    height: 150px;
                    object-fit: cover;
                "
            >

            <h3>
                ${product.name}
            </h3>

            <p>
                KSh ${Number(product.price).toLocaleString()}
            </p>

            <p>
                Category: ${product.category}
            </p>

            <p>
                Colours: ${
                    Array.isArray(product.colors) &&
                    product.colors.length > 0
                        ? product.colors.join(", ")
                        : "Not specified"
                }
            </p>

            <p>
                Stock: ${stock}
            </p>

            <button
                onclick="editProduct(${index})"
            >
                Edit
            </button>

            <button
                onclick="deleteProduct(${index})"
            >
                Delete
            </button>

        `;


        productList.appendChild(productItem);

    });

}


// ==========================================
// DELETE PRODUCT
// ==========================================

async function deleteProduct(index) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmDelete) {
        return;
    }


    const product = products[index];

    if (!product || !product.id) {
        alert("This product has not been saved to the shared catalog yet.");
        return;
    }

    try {
        const response = await adminRequest("/api/products/" + product.id, {
            method: "DELETE"
        });

        if (!response) return;

        products.splice(index, 1);
    } catch (error) {
        alert(error.message);
        return;
    }


    displayAdminProducts();

    updateDashboard();

}


// ==========================================
// EDIT PRODUCT
// ==========================================

function editProduct(index) {

    const product =
        products[index];


    if (!product) {
        return;
    }


    document.getElementById(
        "editProductIndex"
    ).value = index;


    document.getElementById(
        "editProductName"
    ).value = product.name;


    document.getElementById(
        "editProductPrice"
    ).value = product.price;


    document.getElementById(
        "editProductStock"
    ).value =
        Number(product.stock) || 0;


    document.getElementById(
        "editProductCategory"
    ).value =
        product.category;

    document.getElementById(
        "editProductColors"
    ).value =
        Array.isArray(product.colors)
            ? product.colors.join(", ")
            : "";


    document.getElementById(
        "editProductImage"
    ).value = "";


    document.getElementById(
        "edit-section"
    ).style.display = "block";


    document.getElementById(
        "edit-section"
    ).scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// SAVE EDITED PRODUCT
// ==========================================

const editProductForm =
    document.getElementById("editProductForm");


editProductForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const index =
            Number(
                document.getElementById(
                    "editProductIndex"
                ).value
            );


        const product =
            products[index];


        if (!product) {
            return;
        }


        product.name =
            document.getElementById(
                "editProductName"
            ).value.trim();


        product.price =
            Number(
                document.getElementById(
                    "editProductPrice"
                ).value
            );


        product.stock =
            Number(
                document.getElementById(
                    "editProductStock"
                ).value
            );


        product.category =
            document.getElementById(
                "editProductCategory"
            ).value;


        product.colors =
            document.getElementById(
                "editProductColors"
            ).value
                .split(",")
                .map(function(color) {
                    return color.trim();
                })
                .filter(function(color) {
                    return color !== "";
                });


        const imageFile =
            document.getElementById(
                "editProductImage"
            ).files[0];


        if (imageFile) {

            const reader =
                new FileReader();


            reader.onload =
                function(event) {

                    product.image =
                        event.target.result;


                    saveEditedProduct(index);

                };


            reader.readAsDataURL(imageFile);

        } else {

            saveEditedProduct(index);

        }

    }
);


// ==========================================
// SAVE EDITED PRODUCT
// ==========================================

async function saveEditedProduct(index) {

    const product = products[index];

    if (!product || !product.id) {
        alert("This product has not been saved to the shared catalog yet.");
        return;
    }

    try {
        const response = await adminRequest("/api/products/" + product.id, {
            method: "PUT",
            body: JSON.stringify(product)
        });

        if (!response) return;

        products[index] = await response.json();
    } catch (error) {
        alert(error.message);
        return;
    }


    displayAdminProducts();

    updateDashboard();


    document.getElementById(
        "editProductForm"
    ).reset();


    document.getElementById(
        "edit-section"
    ).style.display = "none";


    alert(
        "Product updated successfully!"
    );

}


// ==========================================
// CANCEL EDIT
// ==========================================

function cancelEdit() {

    document.getElementById(
        "edit-section"
    ).style.display = "none";

}


// ==========================================
// DISPLAY CUSTOMER ORDERS
// ==========================================

displayOrders = function() {

    activeOrderFilter = "all-orders";

    const ordersList =
        document.getElementById("orders-list");


    if (!ordersList) {
        return;
    }


    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    ordersList.innerHTML = "";


    if (orders.length === 0) {

        ordersList.innerHTML =
            "<p>No orders yet.</p>";

        return;
    }


    // Newest orders first

    orders
        .slice()
        .reverse()
        .forEach(function(order, reversedIndex) {


            const actualIndex =
                orders.length -
                1 -
                reversedIndex;


            const orderItem =
                document.createElement("div");


            orderItem.className =
                "admin-order";


            // ==================================
            // PRODUCTS IN ORDER
            // ==================================

            let productsHTML = "";


            if (order.products) {

                order.products.forEach(
                    function(product) {

                        const itemTotal =
                            Number(product.price) *
                            Number(product.quantity);


                        productsHTML += `

                            <p>
                                ${product.name}
                                × ${product.quantity}
                                —
                                KSh ${itemTotal.toLocaleString()}
                            </p>

                        `;

                    }
                );

            }


            // ==================================
            // ORDER STATUS
            // ==================================

            const orderStatus =
                order.status || "Pending";


            // ==================================
            // ORDER CARD
            // ==================================

            orderItem.innerHTML = `

                <h3>
                    Order #${order.id}
                </h3>


                <p>
                    <strong>Customer:</strong>
                    ${order.customerName || "N/A"}
                </p>


                <p>
                    <strong>Phone:</strong>
                    ${order.customerPhone || "N/A"}
                </p>


                <p>
                    <strong>Location:</strong>
                    ${order.customerLocation || "N/A"}
                </p>


                <p>
                    <strong>Notes:</strong>
                    ${order.customerNotes || "None"}
                </p>


                <h4>
                    Products
                </h4>


                ${productsHTML}


                <p>
                    <strong>Total:</strong>
                    KSh ${Number(order.total || 0).toLocaleString()}
                </p>


                <p>
                    <strong>Date:</strong>
                    ${order.date || "N/A"}
                </p>


                <p>
                    <strong>Status:</strong>
                    ${orderStatus}
                </p>


                <label>
                    Update Status
                </label>


                <select
                    onchange="
                        updateOrderStatus(
                            ${actualIndex},
                            this.value
                        )
                    "
                >

                    <option
                        value="Pending"
                        ${orderStatus === "Pending"
                            ? "selected"
                            : ""}
                    >
                        Pending
                    </option>


                    <option
                        value="Processing"
                        ${orderStatus === "Processing"
                            ? "selected"
                            : ""}
                    >
                        Processing
                    </option>


                    <option
                        value="Completed"
                        ${orderStatus === "Completed"
                            ? "selected"
                            : ""}
                    >
                        Completed
                    </option>


                    <option
                        value="Cancelled"
                        ${orderStatus === "Cancelled"
                            ? "selected"
                            : ""}
                    >
                        Cancelled
                    </option>

                </select>


                <br>
                <br>


                <button
                    onclick="
                        deleteOrder(${actualIndex})
                    "
                >
                    Delete Order
                </button>

            `;


            ordersList.appendChild(orderItem);

        });

}


// ==========================================
// UPDATE ORDER STATUS
// ==========================================

function updateOrderStatus(
    index,
    newStatus
) {

    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    if (!orders[index]) {

        alert(
            "Order could not be found."
        );

        return;
    }


    orders[index].status =
        newStatus;


    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );


    displayOrders();

    updateDashboard();


    alert(
        "Order status updated to " +
        newStatus
    );

}


// ==========================================
// DELETE ORDER
// ==========================================

function deleteOrder(index) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this order?"
        );


    if (!confirmDelete) {
        return;
    }


    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    orders.splice(index, 1);


    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );


    displayOrders();

    updateDashboard();

}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

updateDashboard = function() {

    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    // ======================================
    // TOTAL PRODUCTS
    // ======================================

    const totalProducts =
        products.length;


    // ======================================
    // ORDER COUNTS
    // ======================================

    let pendingOrders = 0;

    let processingOrders = 0;

    let completedOrders = 0;


    // ======================================
    // TOTAL SALES
    // ======================================

    let totalSales = 0;


    orders.forEach(function(order) {

        const status =
            order.status || "Pending";


        if (status === "Pending") {

            pendingOrders++;

        }


        if (status === "Processing") {

            processingOrders++;

        }


        if (status === "Completed") {

            completedOrders++;


            totalSales +=
                Number(order.total) || 0;

        }

    });


    // ======================================
    // UPDATE HTML
    // ======================================

    const totalProductsElement =
        document.getElementById(
            "total-products"
        );


    const totalOrdersElement =
        document.getElementById(
            "total-orders"
        );


    const pendingOrdersElement =
        document.getElementById(
            "pending-orders"
        );


    const processingOrdersElement =
        document.getElementById(
            "processing-orders"
        );


    const completedOrdersElement =
        document.getElementById(
            "completed-orders"
        );


    const totalSalesElement =
        document.getElementById(
            "total-sales"
        );


    if (totalProductsElement) {

        totalProductsElement.textContent =
            totalProducts;

    }


    if (totalOrdersElement) {

        totalOrdersElement.textContent =
            orders.length;

    }


    if (pendingOrdersElement) {

        pendingOrdersElement.textContent =
            pendingOrders;

    }


    if (processingOrdersElement) {

        processingOrdersElement.textContent =
            processingOrders;

    }


    if (completedOrdersElement) {

        completedOrdersElement.textContent =
            completedOrders;

    }


    if (totalSalesElement) {

        totalSalesElement.textContent =
            totalSales.toLocaleString();

    }

}


// ==========================================
// INITIAL LOAD
// ==========================================

displayAdminProducts();

displayOrders();

updateDashboard();

updateAdminLoginStatus();

loadAdminProducts();
// ==========================================
// DASHBOARD CARD FILTERING
// ==========================================

function showAdminSection(filter) {

    const ordersSection =
        document.querySelector(".admin-orders");

    const productsSection =
        document.querySelector(".admin-products");


    // ======================================
    // PRODUCTS
    // ======================================

    if (filter === "products") {

        if (productsSection) {

            productsSection.scrollIntoView({
                behavior: "smooth"
            });

        }

        return;
    }


    // ======================================
    // ORDERS
    // ======================================

    if (!ordersSection) {
        return;
    }


    // Show orders section

    ordersSection.scrollIntoView({
        behavior: "smooth"
    });


    // ======================================
    // GET ORDERS
    // ======================================

    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    const ordersList =
        document.getElementById("orders-list");


    if (!ordersList) {
        return;
    }


    ordersList.innerHTML = "";


    // ======================================
    // FILTER
    // ======================================

    let filteredOrders;


    if (filter === "all-orders") {

        filteredOrders = orders;

    } else {

        filteredOrders =
            orders.filter(function(order) {

                return (
                    (order.status || "Pending") ===
                    filter
                );

            });

    }


    // ======================================
    // NO ORDERS
    // ======================================

    if (filteredOrders.length === 0) {

        ordersList.innerHTML = `

            <div class="no-filtered-orders">

                <h3>
                    No ${filter === "all-orders"
                        ? ""
                        : filter.toLowerCase()
                    } orders found
                </h3>

                <p>
                    There are currently no orders
                    in this category.
                </p>

            </div>

        `;

        return;
    }


    // ======================================
    // DISPLAY FILTERED ORDERS
    // ======================================

    filteredOrders
        .slice()
        .reverse()
        .forEach(function(order) {

            let productsHTML = "";


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

                            <p>
                                ${product.name}
                                × ${product.quantity}
                                —
                                KSh
                                ${itemTotal.toLocaleString()}
                            </p>

                        `;

                    }
                );

            }


            const orderStatus =
                order.status || "Pending";


            ordersList.innerHTML += `

                <div class="admin-order">

                    <h3>
                        Order #${order.id}
                    </h3>


                    <p>
                        <strong>Customer:</strong>
                        ${order.customerName || "N/A"}
                    </p>


                    <p>
                        <strong>Phone:</strong>
                        ${order.customerPhone || "N/A"}
                    </p>


                    <p>
                        <strong>Location:</strong>
                        ${order.customerLocation || "N/A"}
                    </p>


                    <p>
                        <strong>Notes:</strong>
                        ${order.customerNotes || "None"}
                    </p>


                    <h4>
                        Products
                    </h4>


                    ${productsHTML}


                    <p>
                        <strong>Total:</strong>
                        KSh
                        ${Number(
                            order.total || 0
                        ).toLocaleString()}
                    </p>


                    <p>
                        <strong>Date:</strong>
                        ${order.date || "N/A"}
                    </p>


                    <p>
                        <strong>Status:</strong>
                        ${orderStatus}
                    </p>

                </div>

            `;

        });

}
// ==========================================
// DASHBOARD CARD NAVIGATION
// ==========================================

function openAdminPanel(section) {

    const productsSection =
        document.querySelector(".admin-products");

    const ordersSection =
        document.querySelector(".admin-orders");

    // ======================================
    // PRODUCTS
    // ======================================

    if (section === "products") {

        if (productsSection) {

            productsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

        return;
    }


    // ======================================
    // ORDERS
    // ======================================

    if (
        section === "all-orders" ||
        section === "Pending" ||
        section === "Processing" ||
        section === "Completed"
    ) {

        if (!ordersSection) {

            alert("Orders panel could not be found.");

            return;
        }


        // Show the orders section

        ordersSection.style.display = "block";


        // Filter and display the selected orders

        displayOrdersByStatus(section);


        // Scroll to the orders panel

        setTimeout(function() {

            ordersSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }, 100);

    }

}


// ==========================================
// DISPLAY ORDERS BY STATUS
// ==========================================

displayOrdersByStatus = function(filter) {

    activeOrderFilter = filter;

    const ordersList =
        document.getElementById("orders-list");

    if (!ordersList) {
        return;
    }


    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    let filteredOrders;


    // ======================================
    // ALL ORDERS
    // ======================================

    if (filter === "all-orders") {

        filteredOrders = orders;

    }

    // ======================================
    // SPECIFIC STATUS
    // ======================================

    else {

        filteredOrders =
            orders.filter(function(order) {

                return (
                    (order.status || "Pending") ===
                    filter
                );

            });

    }


    // Clear previous orders

    ordersList.innerHTML = "";


    // ======================================
    // NO ORDERS
    // ======================================

    if (filteredOrders.length === 0) {

        ordersList.innerHTML = `

            <div class="no-filtered-orders">

                <h3>
                    No ${
                        filter === "all-orders"
                            ? ""
                            : filter.toLowerCase()
                    } orders
                </h3>

                <p>
                    There are currently no orders
                    in this category.
                </p>

            </div>

        `;

        return;
    }


    // ======================================
    // NEWEST FIRST
    // ======================================

    filteredOrders
        .slice()
        .reverse()
        .forEach(function(order) {

            let productsHTML = "";


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

                            <div class="order-product-row">

                                <span>
                                    ${product.name}
                                    × ${product.quantity}
                                </span>

                                <strong>
                                    KSh
                                    ${itemTotal.toLocaleString()}
                                </strong>

                            </div>

                        `;

                    }
                );

            }


            const orderStatus =
                order.status || "Pending";


            // ==================================
            // ORDER CARD
            // ==================================

            const orderItem =
                document.createElement("div");


            orderItem.className =
                "admin-order";


            orderItem.innerHTML = `

                <h3>
                    Order #${order.id}
                </h3>


                <p>
                    <strong>Customer:</strong>
                    ${order.customerName || "N/A"}
                </p>


                <p>
                    <strong>Phone:</strong>
                    ${order.customerPhone || "N/A"}
                </p>


                <p>
                    <strong>Location:</strong>
                    ${order.customerLocation || "N/A"}
                </p>


                <p>
                    <strong>Notes:</strong>
                    ${order.customerNotes || "None"}
                </p>


                <h4>
                    Products
                </h4>


                <div class="order-products">

                    ${productsHTML}

                </div>


                <p>
                    <strong>Total:</strong>
                    KSh
                    ${Number(
                        order.total || 0
                    ).toLocaleString()}
                </p>


                <p>
                    <strong>Date:</strong>
                    ${order.date || "N/A"}
                </p>


                <p>
                    <strong>Status:</strong>
                    ${orderStatus}
                </p>


                <label>
                    Update Status
                </label>


                <select
                    onchange="
                        updateOrderStatusById(
                            ${order.id},
                            this.value
                        )
                    "
                >

                    <option
                        value="Pending"
                        ${
                            orderStatus === "Pending"
                                ? "selected"
                                : ""
                        }
                    >
                        Pending
                    </option>


                    <option
                        value="Processing"
                        ${
                            orderStatus === "Processing"
                                ? "selected"
                                : ""
                        }
                    >
                        Processing
                    </option>


                    <option
                        value="Completed"
                        ${
                            orderStatus === "Completed"
                                ? "selected"
                                : ""
                        }
                    >
                        Completed
                    </option>


                    <option
                        value="Cancelled"
                        ${
                            orderStatus === "Cancelled"
                                ? "selected"
                                : ""
                        }
                    >
                        Cancelled
                    </option>

                </select>


                <br>
                <br>


                <button
                    type="button"
                    onclick="
                        deleteOrderById(${order.id})
                    "
                >
                    Delete Order
                </button>

            `;


            ordersList.appendChild(orderItem);

        });

}


// ==========================================
// UPDATE ORDER STATUS BY ID
// ==========================================

function updateOrderStatusById(
    orderId,
    newStatus
) {

    const orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    const order =
        orders.find(function(item) {

            return Number(item.id) ===
                Number(orderId);

        });


    if (!order) {

        alert("Order could not be found.");

        return;
    }


    order.status = newStatus;


    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );


    updateDashboard();


    // Keep the admin on the category they selected. For example, changing a
    // Pending order to Completed removes it from the Pending list rather than
    // unexpectedly switching the whole screen to Completed orders.

    displayOrdersByStatus(activeOrderFilter);


    alert(
        "Order #" +
        orderId +
        " updated to " +
        newStatus
    );

}


// ==========================================
// DELETE ORDER BY ID
// ==========================================

function deleteOrderById(orderId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete Order #" +
            orderId +
            "?"
        );


    if (!confirmed) {
        return;
    }


    let orders =
        JSON.parse(
            localStorage.getItem("orders")
        ) || [];


    orders =
        orders.filter(function(order) {

            return Number(order.id) !==
                Number(orderId);

        });


    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );


    updateDashboard();


    displayOrdersByStatus(activeOrderFilter);

}


// ==========================================
// CLOSE ORDERS PANEL
// ==========================================

function hideOrdersPanel() {

    const ordersSection =
        document.querySelector(".admin-orders");


    if (ordersSection) {

        ordersSection.style.display = "none";

    }

}


// ==========================================
// CUSTOMER REVIEWS
// ==========================================

displayAdminReviews = function() {

    const reviewList =
        document.getElementById("admin-review-list");


    if (!reviewList) {
        return;
    }


    const reviews =
        JSON.parse(localStorage.getItem("reviews")) || [];


    reviewList.innerHTML = "";


    if (reviews.length === 0) {

        reviewList.innerHTML = "<p>No customer feedback yet.</p>";

        return;
    }


    reviews.forEach(function(review) {

        const reviewItem =
            document.createElement("article");

        reviewItem.className = "admin-review";

        reviewItem.innerHTML = `
            <h3>${review.name}</h3>
            <p class="review-stars">${"★".repeat(Number(review.rating) || 0)}${"☆".repeat(5 - (Number(review.rating) || 0))}</p>
            <p><strong>Product:</strong> ${review.product || "General feedback"}</p>
            <p>${review.comment}</p>
            <p><small>${review.date || ""}</small></p>
            <button type="button" onclick="deleteReview(${review.id})">Delete Feedback</button>
        `;

        reviewList.appendChild(reviewItem);

    });

}


deleteReview = function(reviewId) {

    if (!confirm("Delete this customer feedback?")) {
        return;
    }


    const reviews =
        (JSON.parse(localStorage.getItem("reviews")) || [])
            .filter(function(review) {
                return Number(review.id) !== Number(reviewId);
            });


    localStorage.setItem("reviews", JSON.stringify(reviews));

    displayAdminReviews();

}


displayAdminReviews();


// ==========================================
// SHARED ORDERS AND CUSTOMER FEEDBACK
// ==========================================

let sharedOrders = [];

function renderSharedOrders(filter = activeOrderFilter) {
    activeOrderFilter = filter;
    const ordersList = document.getElementById("orders-list");
    if (!ordersList) return;

    const visibleOrders = filter === "all-orders"
        ? sharedOrders
        : sharedOrders.filter(function(order) { return (order.status || "Pending") === filter; });

    ordersList.innerHTML = "";
    if (!visibleOrders.length) {
        ordersList.innerHTML = "<p>No orders in this category yet.</p>";
        return;
    }

    visibleOrders.forEach(function(order) {
        const productsHtml = (order.products || []).map(function(product) {
            return "<p>" + product.name + " × " + product.quantity + " — KSh " +
                (Number(product.price) * Number(product.quantity)).toLocaleString() + "</p>";
        }).join("");

        const card = document.createElement("article");
        card.className = "admin-order status-" + String(order.status || "Pending").toLowerCase();
        const orderNumber = order.orderNumber || ("No." + String(order.id).padStart(3, "0"));
        const orderStatus = order.status || "Pending";
        card.innerHTML =
            "<div class='admin-order-header'>" +
                "<div><span class='admin-order-label'>Order</span><h3>" + orderNumber + "</h3></div>" +
                "<span class='admin-order-status'>" + orderStatus + "</span>" +
            "</div>" +
            "<div class='admin-order-meta'><span>Placed " + (order.date || "N/A") + "</span></div>" +
            "<div class='admin-order-grid'>" +
                "<section class='admin-order-panel'><h4>Customer</h4>" +
                    "<p><strong>" + (order.customerName || "N/A") + "</strong></p>" +
                    "<p>" + (order.customerPhone || "No phone") + "</p>" +
                "</section>" +
                "<section class='admin-order-panel'><h4>Delivery</h4>" +
                    "<p>" + (order.customerLocation || "N/A") + "</p>" +
                    "<p class='admin-order-notes'><strong>Note:</strong> " + (order.customerNotes || "None") + "</p>" +
                "</section>" +
            "</div>" +
            "<section class='admin-order-items'><h4>Items ordered</h4>" + productsHtml + "</section>" +
            "<div class='admin-order-footer'>" +
                "<div><span class='admin-order-label'>Order total</span><strong>KSh " + Number(order.total || 0).toLocaleString() + "</strong></div>" +
                "<div><span class='admin-order-label'>Payment</span><strong>" + (order.paymentMethod || "N/A") + "</strong></div>" +
            "</div>" +
            "<div class='admin-order-actions'><label>Update status <select data-order-id='" + order.id + "'>" +
                ["Pending", "Processing", "Completed", "Cancelled"].map(function(status) {
                    return "<option value='" + status + "'" + (orderStatus === status ? " selected" : "") + ">" + status + "</option>";
                }).join("") +
            "</select></label><button type='button' data-delete-order='" + order.id + "'>Delete order</button></div>";

        const statusSelect = card.querySelector("select");
        statusSelect.addEventListener("change", function() {
            updateOrderStatusById(order.id, statusSelect.value);
        });
        card.querySelector("[data-delete-order]").addEventListener("click", function() {
            deleteOrderById(order.id);
        });
        ordersList.appendChild(card);
    });
}

async function loadSharedOrders() {
    if (!adminToken) return;
    try {
        const response = await adminRequest("/api/orders");
        if (!response) return;
        sharedOrders = await response.json();
        renderSharedOrders(activeOrderFilter);
        updateDashboard();
    } catch (error) {
        console.warn("Could not load shared orders.", error);
    }
}

updateOrderStatusById = async function(orderId, newStatus) {
    try {
        const response = await adminRequest("/api/orders/" + orderId, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });
        if (!response) return;
        const updatedOrder = await response.json();
        sharedOrders = sharedOrders.map(function(order) {
            return Number(order.id) === Number(orderId) ? updatedOrder : order;
        });
        renderSharedOrders(activeOrderFilter);
        updateDashboard();
    } catch (error) {
        alert(error.message || "Could not update this order.");
    }
}

deleteOrderById = async function(orderId) {
    if (!confirm("Delete " + (sharedOrders.find(function(order) { return Number(order.id) === Number(orderId); })?.orderNumber || ("No." + String(orderId).padStart(3, "0"))) + "?")) return;
    try {
        const response = await adminRequest("/api/orders/" + orderId, { method: "DELETE" });
        if (!response) return;
        sharedOrders = sharedOrders.filter(function(order) { return Number(order.id) !== Number(orderId); });
        renderSharedOrders(activeOrderFilter);
        updateDashboard();
    } catch (error) {
        alert(error.message || "Could not delete this order.");
    }
}

displayOrders = function() {
    activeOrderFilter = "all-orders";
    renderSharedOrders(activeOrderFilter);
}

displayOrdersByStatus = function(filter) {
    renderSharedOrders(filter);
}

displayAdminReviews = function() {
    const reviewList = document.getElementById("admin-review-list");
    if (!reviewList) return;

    fetch(getApiUrl() + "/api/reviews")
        .then(function(response) {
            if (!response.ok) throw new Error("Could not load customer feedback.");
            return response.json();
        })
        .then(function(reviews) {
            reviewList.innerHTML = "";
            if (!reviews.length) {
                reviewList.innerHTML = "<p>No customer feedback yet.</p>";
                return;
            }
            reviews.forEach(function(review) {
                const card = document.createElement("article");
                card.className = "admin-review";
                card.innerHTML =
                    "<h3>" + review.name + "</h3>" +
                    "<p class='review-stars'>" + "★".repeat(Number(review.rating) || 0) + "☆".repeat(5 - (Number(review.rating) || 0)) + "</p>" +
                    "<p><strong>Product:</strong> " + (review.product || "General feedback") + "</p>" +
                    "<p>" + review.comment + "</p><p><small>" + (review.date || "") + "</small></p>" +
                    "<button type='button'>Delete Feedback</button>";
                card.querySelector("button").addEventListener("click", function() { deleteReview(review.id); });
                reviewList.appendChild(card);
            });
        })
        .catch(function(error) { console.warn("Could not load shared feedback.", error); });
}

deleteReview = async function(reviewId) {
    if (!confirm("Delete this customer feedback?")) return;
    try {
        const response = await adminRequest("/api/reviews/" + reviewId, { method: "DELETE" });
        if (response) displayAdminReviews();
    } catch (error) {
        alert(error.message || "Could not delete this feedback.");
    }
}

updateDashboard = function() {
    const counts = { Pending: 0, Processing: 0, Completed: 0 };
    let totalSales = 0;
    sharedOrders.forEach(function(order) {
        const status = order.status || "Pending";
        if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status]++;
        if (status === "Completed") totalSales += Number(order.total) || 0;
    });
    const values = {
        "total-products": products.length,
        "total-orders": sharedOrders.length,
        "pending-orders": counts.Pending,
        "processing-orders": counts.Processing,
        "completed-orders": counts.Completed,
        "total-sales": totalSales.toLocaleString()
    };
    Object.keys(values).forEach(function(id) {
        const element = document.getElementById(id);
        if (element) element.textContent = values[id];
    });
}

function loadSharedAdminData() {
    loadSharedOrders();
    displayAdminReviews();
}

if (adminToken) loadSharedAdminData();
setInterval(function() {
    if (adminToken) loadSharedAdminData();
}, 30000);
