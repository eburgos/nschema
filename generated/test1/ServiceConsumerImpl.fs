namespace NSchema.Model.Invoicing

/// <summary></summary>
type InvoiceServiceSrv(connectionString: string, queueName: string) =
    inherit InvoiceServiceConsumer(connectionString, queueName)
    override this.Authenticate userName password =
        match userName, password with
        | "manager", "password" ->
            new UserInfo(Name = "manager", Status = NSchema.Model.Invoicing.AuthenticationStatus.LoggedIn)
        | usr, _ ->
            new UserInfo(Name = usr, Status = NSchema.Model.Invoicing.AuthenticationStatus.LoggedOut)
    override this.GetInvoiceList userName password =
        match (this.Authenticate userName password).Status with
        | NSchema.Model.Invoicing.AuthenticationStatus.LoggedIn ->
            [
                new Invoice(
                    CustomerId = 1234,
                    Details = [
                        new InvoiceDetail(ProductId=11, Description="Diet 7up", Quantity=4.0, UnitPrice=1.25);
                        new InvoiceDetail(ProductId=12, Description="Diet Pepsi", Quantity=3.0, UnitPrice=1.20)
                    ]);
                new Invoice(
                    CustomerId = 1235, 
                    Details = [
                        new InvoiceDetail(ProductId=21, Description="Croissant", Quantity=1.0, UnitPrice=3.25);
                        new InvoiceDetail(ProductId=22, Description="CheeseBurger", Quantity=1.0, UnitPrice=5.25)
                    ]
                )
            ]
        | _ ->
            []
    override this.GetTwoValueOperation userName password =
        match (this.Authenticate userName password).Status with
        | NSchema.Model.Invoicing.AuthenticationStatus.LoggedIn ->
            ([
                new Invoice(
                    CustomerId = 1234,
                    Details = [
                        new InvoiceDetail(ProductId=11, Description="Diet 7up", Quantity=4.0, UnitPrice=1.25);
                        new InvoiceDetail(ProductId=12, Description="Diet Pepsi", Quantity=3.0, UnitPrice=1.20)
                    ]);
                new Invoice(
                    CustomerId = 1235, 
                    Details = [
                        new InvoiceDetail(ProductId=21, Description="Croissant", Quantity=1.0, UnitPrice=3.25);
                        new InvoiceDetail(ProductId=22, Description="CheeseBurger", Quantity=1.0, UnitPrice=5.25)
                    ]
                )
            ], null)
        | _ ->
            ([], "Unauthorized")
    
    