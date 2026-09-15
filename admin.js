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
    // Use the Vercel /api proxy on the live site; use Render directly only for local development.

    try {
        const response = await fetch((apiUrl || "") + "/api/products?summary=1&v=" + Date.now());
        if (!response.ok) throw new Error("Could not load products.");
        products = await response.json();
        displayAdminProducts();
        updateDashboard();
        // Refresh full image data in the background so the list appears immediately.
        fetch((apiUrl || "") + "/api/products?v=" + Date.now())
            .then(function(fullResponse) { if (!fullResponse.ok) throw new Error("Could not load product images."); return fullResponse.json(); })
            .then(function(fullProducts) { products = fullProducts; displayAdminProducts(); updateDashboard(); })
            .catch(function(imageError) { console.warn("Product list loaded, but images could not be refreshed.", imageError); });
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
const addProductSection = document.getElementById("add-product-section");
const openProductFormButton = document.getElementById("openProductFormButton");
const cancelProductFormButton = document.getElementById("cancelProductFormButton");

if (openProductFormButton && addProductSection) {
    openProductFormButton.addEventListener("click", function() {
        addProductSection.hidden = false;
        addProductSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(function() { document.getElementById("productName")?.focus(); }, 350);
    });
}

if (cancelProductFormButton && addProductSection && productForm) {
    cancelProductFormButton.addEventListener("click", function() {
        productForm.reset();
        addProductSection.hidden = true;
        openProductFormButton?.focus();
    });
}

// The API accepts up to 25 MB of JSON. A base64 data URL is about 33% larger
// than the source image, so cap the selected image before trying to upload it.
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_COUNT = 8;
const MAX_PRODUCT_IMAGE_TOTAL_BYTES = 20 * 1024 * 1024;
function getProductImages(product) {
    const images = Array.isArray(product && product.images) ? product.images : [];
    const legacy = product && (product.image_url || product.image);
    return [...new Set([...images, legacy].filter(value => typeof value === "string" && value.trim()))];
}
function validateImageFiles(files) {
    if (files.length > MAX_PRODUCT_IMAGE_COUNT) { alert("Please choose no more than " + MAX_PRODUCT_IMAGE_COUNT + " images."); return false; }
    if (files.some(file => file.size > MAX_PRODUCT_IMAGE_BYTES)) { alert("Each image must be smaller than 5 MB."); return false; }
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_PRODUCT_IMAGE_TOTAL_BYTES) { alert("The selected images must total less than 20 MB."); return false; }
    return true;
}
function readImageFiles(files) {
    return Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    })));
}

productForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (productForm.dataset.submitting === "true") return;
    productForm.dataset.submitting = "true";
    const submitButton = productForm.querySelector("button[type=\"submit\"]");
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Adding…"; }
    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const stock = Number(document.getElementById("productStock").value);
    const category = document.getElementById("productCategory").value;
    const colors = document.getElementById("productColors").value.split(",").map(color => color.trim()).filter(Boolean);
    const files = Array.from(document.getElementById("productImage").files || []);
    if (!validateImageFiles(files)) { productForm.dataset.submitting = "false"; if (submitButton) { submitButton.disabled = false; submitButton.textContent = "Add Product"; } return; }
    try {
        const images = await readImageFiles(files);
        const product = { name, price, stock, category, colors, image: images[0] || "", images };
        const response = await adminRequest("/api/products", { method: "POST", body: JSON.stringify(product) });
        if (!response) return;
        products.unshift(await response.json());
        alert(images.length ? "Product added successfully!" : "Product added successfully without an image. You can add images later.");
        productForm.reset(); displayAdminProducts(); updateDashboard();
    } catch (error) { console.warn("API product save failed:", error); alert(error.message); }
    finally { productForm.dataset.submitting = "false"; if (submitButton) { submitButton.disabled = false; submitButton.textContent = "Add Product"; } }
});
// DISPLAY PRODUCTS
// ==========================================

function displayAdminProducts() {

    const productList =
        document.getElementById("admin-product-list");


    if (!productList) {
        return;
    }


    if (!document.getElementById("admin-product-search")) {
        const searchWrap = document.createElement("div");
        searchWrap.className = "admin-product-search";
        searchWrap.innerHTML = '<label for="admin-product-search">Search products</label><input type="search" id="admin-product-search" placeholder="Search by name, category, or ID" autocomplete="off">';
        productList.parentElement?.insertBefore(searchWrap, productList);
        searchWrap.querySelector("input")?.addEventListener("input", displayAdminProducts);
    }    productList.innerHTML = "";
    const seenProductIds = new Set();
    const search = (document.getElementById("admin-product-search")?.value || "").toLowerCase().trim();
    const visibleProducts = products.filter(function(product) {
        return !search || [product.name, product.category, product.id].some(function(value) {
            return String(value || "").toLowerCase().includes(search);
        });
    });


    if (products.length === 0) {

        productList.innerHTML =
            "<p>No products added yet.</p>";

        return;
    }


    if (visibleProducts.length === 0) { productList.innerHTML = "<p>No matching products found.</p>"; return; }

    visibleProducts.sort(function(a, b) {
        const aHasImage = Boolean(a.has_image) || getProductImages(a).length > 0;
        const bHasImage = Boolean(b.has_image) || getProductImages(b).length > 0;
        return Number(bHasImage) - Number(aHasImage);
    });

    visibleProducts.forEach(function(product) {
        const productKey = String(product.id || "");
        if (productKey && seenProductIds.has(productKey)) return;
        if (productKey) seenProductIds.add(productKey);
        const index = products.indexOf(product);

        const productItem =
            document.createElement("div");


        productItem.className =
            "admin-product";


        const stock =
            Number(product.stock) || 0;


        productItem.innerHTML = `

            <img
                src="${product.image_url || product.image || "rays-enterprise-catalog-logo.jpg"}"
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

            <button onclick="addProductImage(${index})">Add Image</button>

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


    const editSection = document.getElementById("edit-section");
    editSection.style.display = "block";
    editSection.hidden = false;
    editSection.style.position = "fixed";
    editSection.style.top = "24px";
    editSection.style.left = "50%";
    editSection.style.transform = "translateX(-50%)";
    editSection.style.width = "min(92vw, 680px)";
    editSection.style.height = "calc(100vh - 48px)";
    editSection.style.maxHeight = "calc(100vh - 48px)";
    editSection.style.overflowY = "scroll";
    editSection.style.zIndex = "2000";
    document.body.classList.remove("image-editor-open");
    document.body.classList.add("edit-editor-open");
    document.getElementById("editProductName")?.focus();

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


        const imageFiles = Array.from(document.getElementById("editProductImage").files || []);
        if (!validateImageFiles(imageFiles)) return;
        if (imageFiles.length) {
            readImageFiles(imageFiles).then(function(images) {
                product.images = images;
                product.image = images[0] || "";
                saveEditedProduct(index);
            }).catch(function() { alert("Could not read the selected images."); });
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


    document.getElementById("edit-section").hidden = true;


    alert(
        "Product updated successfully!"
    );

}


// ==========================================
// CANCEL EDIT
// ==========================================

function cancelEdit() {
    const section = document.getElementById("edit-section");
    if (section) { section.hidden = true; section.style.display = "none"; }
    document.body.classList.remove("edit-editor-open", "image-editor-open");
    document.body.style.overflow = "";
}
window.cancelEdit = cancelEdit;


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

let sharedOrders = [];let notificationBaselineReady = false;
let knownOrderIds = new Set();
const notificationButton = document.getElementById("enable-order-notifications");
const notificationStatus = document.getElementById("notification-status");

async function enableOrderNotifications() {
    if (!("Notification" in window)) {
        if (notificationStatus) notificationStatus.textContent = "Browser notifications are not supported.";
        return;
    }
    const permission = await Notification.requestPermission();
    if (notificationStatus) notificationStatus.textContent = permission === "granted" ? "Notifications enabled." : "Notifications are blocked.";
    if (notificationButton) notificationButton.style.display = permission === "granted" ? "none" : "inline-block";
}

function notifyNewOrders(orders) {
    if (!notificationBaselineReady) {
        knownOrderIds = new Set(orders.map(function(order) { return String(order.id); }));
        notificationBaselineReady = true;
        return;
    }
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    orders.forEach(function(order) {
        const id = String(order.id);
        if (knownOrderIds.has(id)) return;
        knownOrderIds.add(id);
        const notification = new Notification("New order " + (order.orderNumber || ("No." + id.padStart(3, "0"))), {
            body: (order.customerName || "A customer") + " placed an order for KSh " + Number(order.total || 0).toLocaleString() + ".",
            icon: "rays-enterprise-logo.jpg",
            tag: "order-" + id
        });
        notification.onclick = function() { window.focus(); notification.close(); };
    });
}

if (notificationButton) notificationButton.addEventListener("click", enableOrderNotifications);


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
        const latestOrders = await response.json();
        notifyNewOrders(latestOrders);
        sharedOrders = latestOrders;
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


// Feedback inbox: unread review IDs are remembered on this admin device.
const feedbackInboxButton = document.getElementById("feedbackInboxButton");
const feedbackInbox = document.getElementById("feedback-inbox");
const feedbackUnreadCount = document.getElementById("feedbackUnreadCount");
const feedbackReadKey = "rays-read-feedback-ids";

function getReadFeedbackIds() {
    return new Set(JSON.parse(localStorage.getItem(feedbackReadKey) || "[]").map(String));
}

function updateFeedbackUnreadCount(reviews) {
    const readIds = getReadFeedbackIds();
    const unread = reviews.filter(function(review) { return !readIds.has(String(review.id)); }).length;
    if (feedbackUnreadCount) {
        feedbackUnreadCount.hidden = unread === 0;
        feedbackUnreadCount.textContent = unread;
    }
}

function refreshFeedbackUnreadCount() {
    fetch(getApiUrl() + "/api/reviews")
        .then(function(response) { if (!response.ok) throw new Error("Could not load feedback."); return response.json(); })
        .then(updateFeedbackUnreadCount)
        .catch(function(error) { console.warn("Could not update feedback badge.", error); });
}

if (feedbackInboxButton && feedbackInbox) {
    feedbackInboxButton.addEventListener("click", function() {
        feedbackInbox.hidden = false;
        fetch(getApiUrl() + "/api/reviews")
            .then(function(response) { return response.ok ? response.json() : []; })
            .then(function(reviews) {
                localStorage.setItem(feedbackReadKey, JSON.stringify(reviews.map(function(review) { return String(review.id); })));
                updateFeedbackUnreadCount(reviews);
            });
        displayAdminReviews();
        feedbackInbox.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

const displayAdminReviewsWithInboxBadge = displayAdminReviews;
displayAdminReviews = function() {
    displayAdminReviewsWithInboxBadge();
    refreshFeedbackUnreadCount();
};

if (adminToken) refreshFeedbackUnreadCount();

const closeFeedbackInboxButton = document.getElementById("closeFeedbackInboxButton");
if (closeFeedbackInboxButton && feedbackInbox) {
    closeFeedbackInboxButton.addEventListener("click", function() {
        feedbackInbox.hidden = true;
        feedbackInboxButton?.focus();
    });
}


let salesBalanceVisible = false;
const toggleSalesBalanceButton = document.getElementById("toggleSalesBalanceButton");

function syncSalesBalanceVisibility() {
    const sales = document.getElementById("total-sales");
    if (!sales) return;
    if (!salesBalanceVisible) {
        if (sales.textContent.trim() !== "*******") sales.dataset.balance = sales.textContent.trim();
        sales.textContent = "*******";
    } else {
        sales.textContent = sales.dataset.balance || "0";
    }
    if (toggleSalesBalanceButton) {
        toggleSalesBalanceButton.textContent = salesBalanceVisible ? "Hide balance" : "Show balance";
        toggleSalesBalanceButton.setAttribute("aria-pressed", String(salesBalanceVisible));
    }
}

if (toggleSalesBalanceButton) {
    toggleSalesBalanceButton.addEventListener("click", function(event) {
        event.stopPropagation();
        salesBalanceVisible = !salesBalanceVisible;
        syncSalesBalanceVisibility();
    });
}

const updateDashboardWithBalanceMask = updateDashboard;
updateDashboard = function() {
    updateDashboardWithBalanceMask();
    syncSalesBalanceVisibility();
};
syncSalesBalanceVisibility();


function addProductImage(index) {
    const product = products[index];
    if (!product) return;
    document.getElementById("imageProductIndex").value = index;
    document.getElementById("image-product-name").textContent = "Adding image for: " + product.name;
    document.getElementById("image-section").hidden = false;
    document.body.classList.remove("edit-editor-open");
    document.body.classList.add("image-editor-open");
    document.getElementById("imageFile")?.focus();
}

const imageForm = document.getElementById("imageForm");
if (imageForm) imageForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    const index = Number(document.getElementById("imageProductIndex").value);
    const product = products[index];
    const files = Array.from(document.getElementById("imageFile").files || []);
    if (!product || !files.length || !validateImageFiles(files)) return;
    try {
        const newImages = await readImageFiles(files);
        const images = [...new Set([...getProductImages(product), ...newImages])];
        const response = await adminRequest("/api/products/" + product.id, { method: "PUT", body: JSON.stringify({ ...product, image: images[0] || "", images }) });
        if (!response) return;
        products[index] = await response.json();
        displayAdminProducts();
        imageForm.reset();
        document.getElementById("image-section").hidden = true;
        document.body.classList.remove("image-editor-open");
    } catch (error) { alert(error.message); }
});
document.getElementById("cancelImageButton")?.addEventListener("click", function() {
    document.getElementById("imageForm").reset();
    document.getElementById("image-section").hidden = true;
    document.body.classList.remove("image-editor-open", "edit-editor-open");
    document.getElementById("imageFile")?.blur();
});

const adminProductSearch = document.getElementById("admin-product-search");
if (adminProductSearch) adminProductSearch.addEventListener("input", displayAdminProducts);




















// Offline sales entry
(function setupOfflineSaleForm() {
    const open = document.getElementById("openOfflineSaleButton");
    const section = document.getElementById("offline-sale-section");
    const form = document.getElementById("offlineSaleForm");
    const select = document.getElementById("offlineSaleProduct");
    const search = document.getElementById("offlineSaleSearch");
    const qty = document.getElementById("offlineSaleQuantity");
    const price = document.getElementById("offlineSalePrice");
    const total = document.getElementById("offlineSaleTotal");
    if (!open || !section || !form || !select) return;
    const populate = function() {
        const term = (search?.value || "").toLowerCase().trim();
        const matches = products.filter(function(product) { return !term || String(product.name || "").toLowerCase().includes(term) || String(product.id || "").includes(term); });
        select.innerHTML = '<option value="">Choose a product</option>' + matches.map(function(product) { return `<option value="${product.id}" data-price="${Number(product.price) || 0}">${product.name} — KSh ${Number(product.price || 0).toLocaleString()}</option>`; }).join("");
    };
    const updateTotal = function() { total.textContent = (Math.max(0, Number(qty.value) || 0) * Math.max(0, Number(price.value) || 0)).toLocaleString(); };
    open.addEventListener("click", function() { populate(); section.hidden = false; section.scrollIntoView({ behavior: "smooth", block: "start" }); });
    document.getElementById("cancelOfflineSaleButton")?.addEventListener("click", function() { form.reset(); section.hidden = true; });
    search?.addEventListener("input", populate);
    select.addEventListener("change", function() { const option = select.options[select.selectedIndex]; price.value = option?.dataset.price || ""; updateTotal(); });
    qty.addEventListener("input", updateTotal); price.addEventListener("input", updateTotal);
    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        if (!select.value) return alert("Choose a product first.");
        const button = form.querySelector("button[type=submit]"); if (button) button.disabled = true;
        try {
            const response = await adminRequest("/api/offline-sales", { method: "POST", body: JSON.stringify({ customerName: document.getElementById("offlineSaleCustomer").value, notes: document.getElementById("offlineSaleNotes").value, paymentMethod: document.getElementById("offlineSalePayment").value, items: [{ productId: Number(select.value), quantity: Number(qty.value), unitPrice: Number(price.value) }] }) });
            if (!response) return;
            const sale = await response.json();
            alert("Offline sale recorded. Stock updated." + (sale.items?.[0]?.shortage ? " Shortage recorded: " + sale.items[0].shortage : ""));
            form.reset(); section.hidden = true; await loadAdminProducts();
        } catch (error) { alert(error.message); } finally { if (button) button.disabled = false; }
    });
})();

