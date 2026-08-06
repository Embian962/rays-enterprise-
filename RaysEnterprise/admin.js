// ==========================================
// RAY'S ENTERPRISE - ADMIN PANEL
// ==========================================


// ==========================================
// LOAD PRODUCTS
// ==========================================

let products =
    JSON.parse(localStorage.getItem("products")) || [];


// The filter currently selected from the dashboard. Keeping this value means
// a status update refreshes the same view instead of unexpectedly switching
// the administrator to a different category.
let activeOrderFilter = "all-orders";


// ==========================================
// ADD PRODUCT
// ==========================================

const productForm =
    document.getElementById("productForm");

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


    const reader = new FileReader();


    reader.onload = function(event) {

        const product = {

            name: name,
            price: price,
            stock: stock,
            category: category,
            colors: colors,
            image: event.target.result

        };


        products.push(product);


        localStorage.setItem(
            "products",
            JSON.stringify(products)
        );


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

function deleteProduct(index) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmDelete) {
        return;
    }


    products.splice(index, 1);


    localStorage.setItem(
        "products",
        JSON.stringify(products)
    );


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

function saveEditedProduct(index) {

    localStorage.setItem(
        "products",
        JSON.stringify(products)
    );


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

function displayOrders() {

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

function updateDashboard() {

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

function displayOrdersByStatus(filter) {

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

function displayAdminReviews() {

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


function deleteReview(reviewId) {

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
